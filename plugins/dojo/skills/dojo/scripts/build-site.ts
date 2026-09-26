#!/usr/bin/env node
// Renders a workspace to a static site: an index with per-section tables,
// one page per item, lesson zero, and the shared assets. Lesson pages get
// accessible reveal controls filled from the sidecar.

import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { isMain, parseCli, runCli } from "./lib/cli.ts";
import { asString } from "./lib/frontmatter.ts";
import { escapeHtml, renderMarkdown, type ListItemInfo } from "./lib/markdown.ts";
import { answerMarkdown, readSidecar, type Sidecar } from "./lib/sidecar.ts";
import { parseSyllabus, type Syllabus, type SyllabusItem } from "./lib/syllabus.ts";
import { findItemFile, itemDir, readProfile, requireWorkspace, sidecarPath, type Profile } from "./lib/workspace.ts";

const USAGE = `usage: build-site.ts <workspace> [--out <dir>] [--if-exists] [--json]

Writes the site to <workspace>/site (or --out): index.html, how-this-works.html,
one page per item under lessons/, projects/ and checkpoints/, and assets/.
Rebuilding overwrites only the files it generated last time.`;

const ASSETS_DIR = resolve(dirname(fileURLToPath(import.meta.url)), "site");
const MANIFEST = ".dojo-site.json";

// The site script is written in TypeScript and shipped as plain JavaScript:
// Node strips the types (node:module, 22.13+), Bun with its transpiler.
export function stripTypes(source: string): string {
  const bun = (globalThis as { Bun?: { Transpiler: new (opts: { loader: string }) => { transformSync: (code: string) => string } } }).Bun;
  if (bun) return new bun.Transpiler({ loader: "ts" }).transformSync(source);
  // Resolved at call time: Bun's node:module has no stripTypeScriptTypes.
  const { stripTypeScriptTypes } = createRequire(import.meta.url)("node:module") as { stripTypeScriptTypes: (code: string, opts: { mode: string }) => string };
  return stripTypeScriptTypes(source, { mode: "strip" });
}

export interface BuildResult {
  outDir: string;
  // Paths relative to outDir.
  files: string[];
}

interface Page {
  // Relative path of the page inside the site, e.g. lessons/L01-x.html.
  href: string;
  item: SyllabusItem | null;
  source: string;
}

interface Site {
  workspace: string;
  syllabus: Syllabus;
  profile: Profile | null;
  courseTitle: string;
  pages: Page[];
  pageByItem: Map<string, Page>;
}

function badge(status: string): string {
  return `<span class="badge badge-${escapeHtml(status)}">${escapeHtml(status)}</span>`;
}

// A small status mark for the sidebar; the status stays readable as text for
// screen readers, so the colour is never the only signal.
function statusDot(status: string): string {
  return `<span class="status-dot status-dot-${escapeHtml(status)}" aria-hidden="true"></span><span class="visually-hidden">(${escapeHtml(status)})</span>`;
}

function progressBar(done: number, total: number): string {
  const percent = total === 0 ? 0 : Math.round((done / total) * 100);
  return `<div class="progress" role="progressbar" aria-label="Course progress" aria-valuemin="0" aria-valuemax="${total}" aria-valuenow="${done}"><span style="width: ${percent}%"></span></div>`;
}

// `next` is the page to open once the item is marked done from the end of a page.
function doneControl(item: SyllabusItem, hasFile: boolean, next = ""): string {
  const undo = hasFile ? "generated" : "planned";
  const label = item.status === "done" ? "Mark not done" : "Mark done";
  const target = item.status === "done" ? undo : "done";
  const nextAttr = next && target === "done" ? ` data-next="${escapeHtml(next)}"` : "";
  return (
    `<span class="done-control"><button type="button" class="done-button" data-id="${escapeHtml(item.id)}" data-status="${target}"${nextAttr}>${label}</button>` +
    `<span class="done-notice" role="status" aria-live="polite" hidden></span></span>`
  );
}

// The first item not yet done, in course order: what the learner works on now.
function focusItem(site: Site): SyllabusItem | null {
  return site.syllabus.items.find((it) => it.status !== "done") ?? null;
}

const STEP_LABEL = /^(Why|How|Do):\s*/;

// Turns one Assignment item, a bold link followed by Why, How and Do lines
// joined with <br>, into a card with labelled rows. Returns null when the
// item does not have that shape, such as a project's requirement.
export function assignmentCard(inner: string): string | null {
  const nestAt = inner.search(/\n<(ul|ol)>/);
  const text = nestAt >= 0 ? inner.slice(0, nestAt) : inner;
  const nested = nestAt >= 0 ? inner.slice(nestAt) : "";
  const [title, ...lines] = text.split(/<br>\n?/);
  const steps: { label: string; html: string }[] = [];
  for (const raw of lines) {
    const line = raw.trim();
    const m = STEP_LABEL.exec(line);
    // The label moves into its own cell, so the line's first word starts the row.
    if (m) steps.push({ label: m[1], html: line.slice(m[0].length).replace(/^[a-z]/, (c) => c.toUpperCase()) });
    else if (steps.length > 0 && line !== "") steps[steps.length - 1].html += ` ${line}`;
    else if (line !== "") return null;
  }
  if (steps.length === 0) return null;
  const host = /href="https?:\/\/([^/"?#]+)/.exec(title)?.[1]?.replace(/^www\./, "");
  const rows = steps.map((st) => `<div class="step step-${st.label.toLowerCase()}"><dt>${st.label}</dt><dd>${st.html}</dd></div>`).join("");
  return (
    `<div class="assignment-card"><p class="assignment-title">${title.trim()}${host ? ` <span class="assignment-host">${escapeHtml(host)}</span>` : ""}</p>` +
    `<dl class="assignment-steps">${rows}</dl>${nested}</div>`
  );
}

function rewriteLink(href: string): string {
  if (/^[a-z][a-z0-9+.-]*:/i.test(href) || href.startsWith("#") || href.startsWith("/")) return href;
  const [path, anchor] = href.split("#");
  if (!path.endsWith(".md") || path.endsWith(".answers.md")) return href;
  return path.replace(/\.md$/, ".html") + (anchor !== undefined ? `#${anchor}` : "");
}

function sidebar(site: Site, currentHref: string | null, root: string): string {
  const total = site.syllabus.items.length;
  const done = site.syllabus.items.filter((it) => it.status === "done").length;
  const currentItem = site.pages.find((p) => p.href === currentHref)?.item ?? null;
  // The section left open: the page's own, else the one holding the item in progress.
  const openSection = (currentItem ?? focusItem(site))?.section ?? site.syllabus.sections[0]?.number;
  const parts: string[] = [];
  parts.push(`<nav class="sidebar" aria-label="Syllabus">`);
  parts.push(`<p class="sidebar-title"><a href="${root}index.html"${currentHref === "index.html" ? ' aria-current="page"' : ""}>${escapeHtml(site.courseTitle)}</a></p>`);
  parts.push(`<p class="sidebar-progress">${done} of ${total} done</p>`);
  parts.push(progressBar(done, total));
  parts.push(`<ul class="sidebar-top"><li><a href="${root}how-this-works.html"${currentHref === "how-this-works.html" ? ' aria-current="page"' : ""}>How this course works</a></li></ul>`);
  for (const section of site.syllabus.sections) {
    const items = site.syllabus.items.filter((it) => it.section === section.number);
    const sectionDone = items.filter((it) => it.status === "done").length;
    const open = section.number === openSection ? " open" : "";
    parts.push(
      `<details class="sidebar-section"${open}><summary><span class="sidebar-section-title">${escapeHtml(section.heading)}</span> ` +
        `<span class="sidebar-section-count" aria-label="${sectionDone} of ${items.length} done">${sectionDone}/${items.length}</span></summary><ol class="sidebar-items">`,
    );
    for (const item of items) {
      const page = site.pageByItem.get(item.id);
      const label = `${statusDot(item.status)}<span class="item-id">${escapeHtml(item.id)}</span> <span class="item-title">${escapeHtml(item.title)}</span>`;
      const current = page && page.href === currentHref;
      const link = page
        ? `<a href="${root}${page.href}"${current ? ' aria-current="page"' : ""}>${label}</a>`
        : `<span class="sidebar-planned">${label}</span>`;
      parts.push(`<li class="status-${escapeHtml(item.status)}${current ? " is-current" : ""}">${link}</li>`);
    }
    parts.push(`</ol></details>`);
  }
  parts.push(`</nav>`);
  return parts.join("\n");
}

function layout(site: Site, title: string, href: string, main: string): string {
  const depth = href.split("/").length - 1;
  const root = depth === 0 ? "" : "../".repeat(depth);
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)} - ${escapeHtml(site.courseTitle)}</title>
<link rel="stylesheet" href="${root}assets/dojo.css">
<script defer src="${root}assets/dojo.js"></script>
</head>
<body data-root="${root}">
<a class="skip-link" href="#main">Skip to content</a>
<div class="layout">
${sidebar(site, href, root)}
<main id="main" class="content">
${main}
</main>
</div>
</body>
</html>
`;
}

function revealDecorator(sidecar: Sidecar | null): (info: ListItemInfo, html: string) => string {
  return (info, html) => {
    if (info.section === "Assignment" && info.ordered && info.depth === 0) return assignmentCard(html) ?? html;
    if (!sidecar || !info.ordered || info.depth !== 0) return html;
    const list = info.section === "Before you start" ? sidecar.prediction : info.section === "Retrieval practice" ? sidecar.retrieval : null;
    if (!list) return html;
    const answer = answerMarkdown(list, info.index);
    if (answer === null) return html;
    const kind = info.section === "Before you start" ? "prediction" : "retrieval";
    const id = `answer-${kind}-${info.index}`;
    const rendered = renderMarkdown(answer, { linkRewrite: rewriteLink });
    return (
      `${html}\n<div class="reveal"><button type="button" class="reveal-toggle" aria-expanded="false" aria-controls="${id}">Show answer</button>` +
      `<div class="reveal-panel" id="${id}" hidden>${rendered}</div></div>`
    );
  };
}

function itemPage(site: Site, page: Page, index: number): string {
  const item = page.item!;
  const markdown = readFileSync(page.source, "utf8");
  const sidecar = item.type === "lesson" ? readSidecar(sidecarPath(page.source)) : null;
  const body = renderMarkdown(markdown, { linkRewrite: rewriteLink, onListItem: revealDecorator(sidecar) });
  const depth = page.href.split("/").length - 1;
  const root = "../".repeat(depth);
  const prev = site.pages.slice(0, index).reverse().find((p) => p.item);
  const next = site.pages.slice(index + 1).find((p) => p.item);
  const pager = [
    prev ? `<a class="pager-prev" rel="prev" href="${root}${prev.href}">Previous: ${escapeHtml(prev.item!.id)} ${escapeHtml(prev.item!.title)}</a>` : "",
    next ? `<a class="pager-next" rel="next" href="${root}${next.href}">Next: ${escapeHtml(next.item!.id)} ${escapeHtml(next.item!.title)}</a>` : "",
  ]
    .filter(Boolean)
    .join("\n");
  const hours = item.hours === null ? "" : ` <span class="item-hours">${item.hours} h</span>`;
  const doneOn = item.done ? ` <span class="item-done-date">done ${escapeHtml(item.done)}</span>` : "";
  const nextHref = next ? `${root}${next.href}` : "";
  const finish =
    item.status === "done"
      ? `<section class="finish controls"><p>Done on ${escapeHtml(item.done)}.${next ? ` <a href="${nextHref}">Next: ${escapeHtml(next.item!.id)} ${escapeHtml(next.item!.title)}</a>` : ""}</p></section>`
      : `<section class="finish controls"><p class="finish-prompt">Finished with this ${escapeHtml(item.type === "checkpoint" ? "checkpoint" : item.type === "lesson" ? "lesson" : "project")}?</p>${doneControl(item, true, nextHref)}</section>`;
  const main = `<header class="item-header controls">
<p class="item-meta"><span class="item-id">${escapeHtml(item.id)}</span> <span class="item-type">${escapeHtml(item.type)}</span> <span class="item-section">Section ${item.section}: ${escapeHtml(item.sectionTitle)}</span>${hours} ${badge(item.status)}${doneOn}</p>
${doneControl(item, true)}
</header>
<article class="item-body item-${escapeHtml(item.type)}">
${body}
</article>
${finish}
<footer class="pager controls">
${pager}
</footer>`;
  return layout(site, `${item.id} ${item.title}`, page.href, main);
}

function indexPage(site: Site): string {
  const goal = site.profile?.goal ? renderMarkdown(site.profile.goal) : "";
  const parts: string[] = [];
  parts.push(`<header class="course-header"><h1>${escapeHtml(site.courseTitle)}</h1>`);
  if (goal) parts.push(`<div class="course-goal"><h2>Goal</h2>${goal}</div>`);
  const done = site.syllabus.items.filter((it) => it.status === "done").length;
  parts.push(`<p class="course-progress">${done} of ${site.syllabus.items.length} items done. New here? Start with <a href="how-this-works.html">how this course works</a>.</p>`);
  parts.push(progressBar(done, site.syllabus.items.length), `</header>`);
  const focus = focusItem(site);
  if (focus) {
    const page = site.pageByItem.get(focus.id);
    const meta = `<span class="item-id">${escapeHtml(focus.id)}</span> ${escapeHtml(focus.type)}${focus.hours === null ? "" : `, ${focus.hours} h`}`;
    parts.push(
      page
        ? `<section class="continue"><p class="continue-label">Continue</p><p class="continue-title"><a href="${page.href}">${escapeHtml(focus.title)}</a></p><p class="continue-meta">${meta}</p></section>`
        : `<section class="continue continue-next"><p class="continue-label">Next up</p><p class="continue-title">${escapeHtml(focus.title)}</p><p class="continue-meta">${meta}. Run <code>/dojo-next</code> in your agent to generate it.</p></section>`,
    );
  } else if (site.syllabus.items.length > 0) {
    parts.push(`<section class="continue"><p class="continue-label">Course complete</p><p class="continue-title">Every item is done.</p></section>`);
  }
  for (const section of site.syllabus.sections) {
    parts.push(`<section class="syllabus-section"><h2>${escapeHtml(section.heading)}</h2>`);
    parts.push(`<table class="syllabus"><thead><tr><th>ID</th><th>Type</th><th>Title</th><th>Hours</th><th>Status</th><th>Done</th><th class="controls">Action</th></tr></thead><tbody>`);
    for (const item of site.syllabus.items.filter((it) => it.section === section.number)) {
      const page = site.pageByItem.get(item.id);
      const title = page ? `<a href="${page.href}">${escapeHtml(item.title)}</a>` : escapeHtml(item.title);
      parts.push(
        `<tr class="status-${escapeHtml(item.status)}" data-id="${escapeHtml(item.id)}"><td class="item-id">${escapeHtml(item.id)}</td><td>${escapeHtml(item.type)}</td><td>${title}</td>` +
          `<td>${item.hours === null ? escapeHtml(item.hoursRaw) : item.hours}</td><td>${badge(item.status)}</td><td>${escapeHtml(item.done)}</td><td class="controls">${page || item.status === "done" ? doneControl(item, Boolean(page)) : `<span class="not-generated">not generated yet</span>`}</td></tr>`,
      );
    }
    parts.push(`</tbody></table></section>`);
  }
  return layout(site, "Syllabus", "index.html", parts.join("\n"));
}

function howThisWorksPage(site: Site, source: string): string {
  const body = renderMarkdown(readFileSync(source, "utf8"), { linkRewrite: rewriteLink });
  return layout(site, "How this course works", "how-this-works.html", `<article class="item-body">\n${body}\n</article>`);
}

export function buildSite(workspace: string, outDir: string = join(workspace, "site")): BuildResult {
  const syllabusFile = join(workspace, "syllabus.md");
  if (!existsSync(syllabusFile)) throw new Error(`no syllabus.md in ${workspace}; run /dojo-plan first`);
  const syllabus = parseSyllabus(readFileSync(syllabusFile, "utf8"));
  let profile: Profile | null = null;
  try {
    profile = readProfile(workspace);
  } catch {
    profile = null;
  }
  const courseTitle = syllabus.title || profile?.topic || asString(syllabus.data.topic) || "dojo";
  const pages: Page[] = [];
  const pageByItem = new Map<string, Page>();
  for (const item of syllabus.items) {
    const source = findItemFile(workspace, item.id, item.type);
    if (!source) continue;
    const href = `${itemDir(item.type)}/${relative(join(workspace, itemDir(item.type)), source).replace(/\.md$/, ".html")}`;
    const page: Page = { href, item, source };
    pages.push(page);
    pageByItem.set(item.id, page);
  }
  const site: Site = { workspace, syllabus, profile, courseTitle, pages, pageByItem };

  const out = resolve(outDir);
  const written: string[] = [];
  const write = (href: string, content: string) => {
    const path = join(out, href);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, content);
    written.push(href);
  };

  write("index.html", indexPage(site));
  const lessonZero = join(workspace, "00-how-this-works.md");
  if (existsSync(lessonZero)) write("how-this-works.html", howThisWorksPage(site, lessonZero));
  pages.forEach((page, index) => write(page.href, itemPage(site, page, index)));
  for (const asset of ["dojo.css", "dojo.js"]) {
    const path = join(out, "assets", asset);
    mkdirSync(dirname(path), { recursive: true });
    if (asset === "dojo.js") writeFileSync(path, stripTypes(readFileSync(join(ASSETS_DIR, "dojo.ts"), "utf8")));
    else copyFileSync(join(ASSETS_DIR, asset), path);
    written.push(`assets/${asset}`);
  }

  // Remove pages this builder wrote last time that no longer exist.
  const manifestPath = join(out, MANIFEST);
  if (existsSync(manifestPath)) {
    try {
      const previous = JSON.parse(readFileSync(manifestPath, "utf8")) as { files?: string[] };
      for (const old of previous.files ?? []) {
        const path = resolve(out, old);
        if (!written.includes(old) && path.startsWith(out + sep) && existsSync(path)) rmSync(path);
      }
    } catch {
      // A damaged manifest only means stale pages linger.
    }
  }
  writeFileSync(manifestPath, JSON.stringify({ files: written }, null, 2) + "\n");
  return { outDir: out, files: written };
}

async function main(): Promise<number> {
  const args = parseCli(process.argv.slice(2), { out: { type: "string" }, "if-exists": { type: "boolean" } });
  if (args.values.help) {
    console.log(USAGE);
    return 0;
  }
  if (!args.positionals[0]) throw Object.assign(new Error("expected <workspace>"), { code: 2 });
  const workspace = requireWorkspace(args.positionals[0]);
  const outDir = typeof args.values.out === "string" ? resolve(args.values.out) : undefined;
  // --if-exists lets dojo-next chain a rebuild without first checking for a site.
  if (args.values["if-exists"] && !existsSync(join(outDir ?? join(workspace, "site"), "index.html"))) {
    console.log("no site built yet; skipping (run /dojo-build to create one)");
    return 0;
  }
  const result = buildSite(workspace, outDir);
  if (args.values.json) console.log(JSON.stringify(result, null, 2));
  else console.log(`built ${result.files.length} files in ${result.outDir}`);
  return 0;
}

if (isMain(import.meta.url)) {
  await runCli(main);
}
