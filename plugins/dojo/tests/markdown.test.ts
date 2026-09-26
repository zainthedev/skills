import { test } from "node:test";
import assert from "node:assert/strict";
import { escapeHtml, headingAnchors, renderMarkdown, slugifyHeading } from "../skills/dojo/scripts/lib/markdown.ts";

test("strips frontmatter and renders headings with GitHub-style ids", () => {
  const html = renderMarkdown("---\nid: L01\n---\n# Title *here*\n\n## Core idea!\n\n### Sub-heading (2)\n\n## Core idea!\n");
  assert.equal(html, '<h1 id="title-here">Title <em>here</em></h1>\n<h2 id="core-idea">Core idea!</h2>\n<h3 id="sub-heading-2">Sub-heading (2)</h3>\n<h2 id="core-idea-1">Core idea!</h2>');
  assert.deepEqual(headingAnchors("## Before you start\n## Retrieval practice"), ["before-you-start", "retrieval-practice"]);
  assert.equal(slugifyHeading("Lesson overview"), "lesson-overview");
});

test("paragraphs and inline markup", () => {
  const html = renderMarkdown("Plain **bold** and *em* and _em2_ and `co**de`.\nSecond line with a [link](https://a.com \"title\") and <https://b.com> and a\\*b.\n\nsnake_case stays, 2 * 3 * 4 stays, __init__ is strong.");
  assert.equal(
    html,
    "<p>Plain <strong>bold</strong> and <em>em</em> and <em>em2</em> and <code>co**de</code>.\nSecond line with a <a href=\"https://a.com\">link</a> and <a href=\"https://b.com\">https://b.com</a> and a*b.</p>\n<p>snake_case stays, 2 * 3 * 4 stays, <strong>init</strong> is strong.</p>",
  );
});

test("escapes HTML in text, code and attributes", () => {
  assert.equal(renderMarkdown('<script>alert("x")</script> & `a<b`'), "<p>&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt; &amp; <code>a&lt;b</code></p>");
  assert.equal(renderMarkdown('[x](https://a.com/?a=1&b="2")'), '<p><a href="https://a.com/?a=1&amp;b=&quot;2&quot;">x</a></p>');
  assert.equal(escapeHtml("<'\">"), "&lt;&#39;&quot;&gt;");
});

test("ordered and unordered lists nest and keep lazy continuation lines", () => {
  const md = "1. **[Guide](https://a.com)**\n   Why: because.\n   How: read.\n   Do: try.\n   - skip chapter 7\n   - and 8\n2. Second\nlazy continuation\n\n- bullet\n- another";
  assert.equal(
    renderMarkdown(md),
    '<ol>\n<li><strong><a href="https://a.com">Guide</a></strong><br>\nWhy: because.<br>\nHow: read.<br>\nDo: try.\n<ul>\n<li>skip chapter 7</li>\n<li>and 8</li>\n</ul></li>\n<li>Second<br>\nlazy continuation</li>\n</ol>\n<ul>\n<li>bullet</li>\n<li>another</li>\n</ul>',
  );
});

test("loose lists wrap items in paragraphs and ordered lists keep their start", () => {
  assert.equal(renderMarkdown("3. a\n\n4. b"), '<ol start="3">\n<li><p>a</p></li>\n<li><p>b</p></li>\n</ol>');
});

test("task lists", () => {
  assert.equal(
    renderMarkdown("- [ ] todo\n- [x] done"),
    '<ul>\n<li class="task-list-item"><input type="checkbox" disabled> todo</li>\n<li class="task-list-item"><input type="checkbox" disabled checked> done</li>\n</ul>',
  );
});

test("fenced code blocks are escaped and carry a language class", () => {
  assert.equal(renderMarkdown("```js\nconst a = \"<b>\";\n```\n\n~~~\nplain\n~~~"), '<pre><code class="language-js">const a = &quot;&lt;b&gt;&quot;;\n</code></pre>\n<pre><code>plain\n</code></pre>');
});

test("blockquotes, horizontal rules and tables", () => {
  assert.equal(renderMarkdown("> **Authored:** note\n> second\n\n---\n\n***"), "<blockquote>\n<p><strong>Authored:</strong> note\nsecond</p>\n</blockquote>\n<hr>\n<hr>");
  assert.equal(
    renderMarkdown("| ID | Type | Note |\n|----|:----:|-----:|\n| L01 | lesson | a \\| b |"),
    '<table>\n<thead>\n<tr><th>ID</th><th align="center">Type</th><th align="right">Note</th></tr>\n</thead>\n<tbody>\n<tr><td>L01</td><td align="center">lesson</td><td align="right">a | b</td></tr>\n</tbody>\n</table>',
  );
});

test("images and link rewriting", () => {
  assert.equal(renderMarkdown("![alt *x*](img.png)"), '<p><img src="img.png" alt="alt x"></p>');
  const html = renderMarkdown("[a](../lessons/L01-x.md#core-idea) [b](https://a.com/x.md)", { linkRewrite: (h) => (h.startsWith("http") ? h : h.replace(".md", ".html")) });
  assert.equal(html, '<p><a href="../lessons/L01-x.html#core-idea">a</a> <a href="https://a.com/x.md">b</a></p>');
});

test("onListItem sees the section, depth and index of each item", () => {
  const seen: string[] = [];
  renderMarkdown("## Retrieval practice\n\n1. one\n   - nested\n2. two\n\n## Other\n\n- three", {
    onListItem: (info, html) => {
      seen.push(`${info.section}/${info.depth}/${info.index}/${info.ordered}`);
      return html + "!";
    },
  });
  assert.deepEqual(seen, ["Retrieval practice/1/1/false", "Retrieval practice/0/1/true", "Retrieval practice/0/2/true", "Other/0/1/false"]);
});
