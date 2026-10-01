#!/usr/bin/env node
// Serves the built site on 127.0.0.1 and accepts the done button's request,
// which marks the syllabus row and rebuilds the site.

import { spawn } from "node:child_process";
import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import { closeSync, existsSync, mkdirSync, openSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { extname, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import type { AddressInfo } from "node:net";
import { buildSite } from "./build-site.ts";
import { isMain, parseCli, runCli } from "./lib/cli.ts";
import { DATA_DIR, DATE_PATTERN, STATUSES } from "./lib/constants.ts";
import { requireWorkspace } from "./lib/workspace.ts";
import { markItem } from "./mark-done.ts";
import { describeItem, readSyllabus, relativeItem } from "./next-item.ts";

const USAGE = `usage: serve.ts <workspace> [--port 4321] [--site <dir>] [--detach | --stop]

Builds the site, then serves it on http://127.0.0.1:<port>/ and prints the URL.
POST /api/done with {"id": "L01"} (optional "status", "date") marks the item
and rebuilds; GET /api/status lists the items. The PID is written to
.lingo/serve.pid; when that server still answers for this workspace, its URL is
printed and nothing new starts. --detach starts the server in its own process
group, so it outlives the shell or agent session that ran the command, prints
the URL and exits; the server's output goes to .lingo/serve.log. --stop stops
the running server. --port 0 picks a free port.`;

const CONTENT_TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".ico": "image/x-icon",
  ".webp": "image/webp",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".pdf": "application/pdf",
};

export interface ServeOptions {
  workspace: string;
  port?: number;
  siteDir?: string;
}

export interface RunningServer {
  server: Server;
  port: number;
  url: string;
  close: () => Promise<void>;
}

export interface PidRecord {
  pid: number;
  url: string;
}

export function pidPath(workspace: string): string {
  return join(workspace, DATA_DIR, "serve.pid");
}

export function readPid(workspace: string): PidRecord | null {
  const path = pidPath(workspace);
  if (!existsSync(path)) return null;
  const [pidLine, urlLine] = readFileSync(path, "utf8").split("\n");
  const pid = Number(pidLine);
  if (!Number.isInteger(pid) || pid <= 0) return null;
  return { pid, url: (urlLine ?? "").trim() };
}

export function isAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return (error as { code?: string }).code === "EPERM";
  }
}

// True when the PID file's server still answers at its URL for this workspace.
// A live PID alone is not enough: after a reboot the number can belong to an
// unrelated process, which must never be reported as the site or sent SIGTERM.
export async function confirmServer(record: PidRecord, workspace: string, timeoutMs = 1500): Promise<boolean> {
  if (!isAlive(record.pid) || !/^http:\/\/127\.0\.0\.1:\d+\/$/.test(record.url)) return false;
  try {
    const res = await fetch(`${record.url}api/status`, { signal: AbortSignal.timeout(timeoutMs) });
    const body = (await res.json()) as { pid?: unknown; workspace?: unknown };
    return body.pid === record.pid && typeof body.workspace === "string" && resolve(body.workspace) === resolve(workspace);
  } catch {
    return false;
  }
}

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

// Starts this script again in its own process group with output to
// .lingo/serve.log, then waits for the child to write its PID file.
async function detach(workspace: string, port: number, site: string | undefined): Promise<string> {
  mkdirSync(join(workspace, DATA_DIR), { recursive: true });
  const logPath = join(workspace, DATA_DIR, "serve.log");
  const log = openSync(logPath, "w");
  const args = [...process.execArgv, fileURLToPath(import.meta.url), workspace, "--port", String(port), ...(site ? ["--site", site] : [])];
  const child = spawn(process.execPath, args, { detached: true, stdio: ["ignore", log, log] });
  closeSync(log);
  let exited: number | null = null;
  child.on("exit", (code) => {
    exited = code ?? 1;
  });
  child.unref();
  const deadline = Date.now() + 15_000;
  while (Date.now() < deadline) {
    const record = readPid(workspace);
    if (record && record.pid === child.pid && record.url) return record.url;
    if (exited !== null) break;
    await sleep(100);
  }
  const tail = existsSync(logPath) ? readFileSync(logPath, "utf8").trim().split("\n").slice(-3).join(" ") : "";
  throw new Error(`the detached server did not start${tail ? `: ${tail}` : ""}; see ${logPath}`);
}

// True when the request came from a page this server served: the Host header
// names this loopback port and any Origin header does too. A page on another
// site can still POST to a loopback address, so the API checks both.
export function isLocalRequest(headers: { host?: string; origin?: string }, port: number): boolean {
  const local = new Set([`127.0.0.1:${port}`, `localhost:${port}`, `[::1]:${port}`]);
  const host = (headers.host ?? "").trim().toLowerCase();
  if (!local.has(host)) return false;
  if (headers.origin === undefined) return true;
  try {
    return local.has(new URL(headers.origin).host.toLowerCase());
  } catch {
    return false;
  }
}

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  const text = JSON.stringify(body);
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
  res.end(text);
}

function readBody(req: IncomingMessage, limit = 64 * 1024): Promise<string> {
  return new Promise((resolvePromise, reject) => {
    let data = "";
    req.on("data", (chunk: Buffer) => {
      data += chunk.toString("utf8");
      if (data.length > limit) {
        reject(new Error("request body too large"));
        req.destroy();
      }
    });
    req.on("end", () => resolvePromise(data));
    req.on("error", reject);
  });
}

function serveStatic(siteDir: string, pathname: string, res: ServerResponse, headOnly: boolean): void {
  let decoded: string;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    sendJson(res, 400, { ok: false, error: "bad path" });
    return;
  }
  let path = resolve(siteDir, "." + decoded);
  if (path !== siteDir && !path.startsWith(siteDir + sep)) {
    sendJson(res, 403, { ok: false, error: "forbidden" });
    return;
  }
  if (existsSync(path) && statSync(path).isDirectory()) path = join(path, "index.html");
  if (!existsSync(path) || !statSync(path).isFile()) {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end(headOnly ? undefined : `not found: ${decoded}\n`);
    return;
  }
  const body = readFileSync(path);
  res.writeHead(200, {
    "Content-Type": CONTENT_TYPES[extname(path).toLowerCase()] ?? "application/octet-stream",
    "Content-Length": body.length,
    "Cache-Control": "no-cache",
  });
  res.end(headOnly ? undefined : body);
}

export function startServer(opts: ServeOptions): Promise<RunningServer> {
  const workspace = opts.workspace;
  const siteDir = resolve(opts.siteDir ?? join(workspace, "site"));
  buildSite(workspace, siteDir);

  const server = createServer(async (req, res) => {
    const url = new URL(req.url ?? "/", "http://127.0.0.1");
    try {
      if (url.pathname.startsWith("/api/") && !isLocalRequest({ host: req.headers.host, origin: req.headers.origin }, (server.address() as AddressInfo).port)) {
        sendJson(res, 403, { ok: false, error: "the lingo API answers pages it served itself only" });
        return;
      }
      if (url.pathname === "/api/status" && req.method === "GET") {
        const syllabus = readSyllabus(workspace);
        sendJson(res, 200, { ok: true, pid: process.pid, workspace, items: syllabus.items.map((it) => relativeItem(workspace, describeItem(workspace, syllabus, it))) });
        return;
      }
      if (url.pathname === "/api/done") {
        if (req.method !== "POST") {
          sendJson(res, 405, { ok: false, error: "use POST" });
          return;
        }
        let payload: { id?: unknown; status?: unknown; date?: unknown };
        try {
          payload = JSON.parse((await readBody(req)) || "{}");
        } catch {
          sendJson(res, 400, { ok: false, error: "body must be JSON" });
          return;
        }
        const id = typeof payload.id === "string" ? payload.id.trim() : "";
        const status = typeof payload.status === "string" ? payload.status : "done";
        const date = typeof payload.date === "string" ? payload.date : undefined;
        if (!id) {
          sendJson(res, 400, { ok: false, error: 'missing "id"' });
          return;
        }
        if (!(STATUSES as readonly string[]).includes(status)) {
          sendJson(res, 400, { ok: false, error: `status must be one of ${STATUSES.join(", ")}` });
          return;
        }
        if (date !== undefined && !DATE_PATTERN.test(date)) {
          sendJson(res, 400, { ok: false, error: "date must be YYYY-MM-DD" });
          return;
        }
        let result;
        try {
          result = markItem(workspace, id, status, date);
        } catch (error) {
          sendJson(res, 404, { ok: false, error: (error as Error).message });
          return;
        }
        buildSite(workspace, siteDir);
        sendJson(res, 200, { ok: true, id: result.item.id, status: result.item.status, done: result.item.done });
        return;
      }
      if (req.method === "GET" || req.method === "HEAD") {
        serveStatic(siteDir, url.pathname, res, req.method === "HEAD");
        return;
      }
      sendJson(res, 405, { ok: false, error: "method not allowed" });
    } catch (error) {
      sendJson(res, 500, { ok: false, error: (error as Error).message });
    }
  });

  return new Promise((resolvePromise, reject) => {
    const wanted = opts.port ?? 4321;
    let attempt = wanted;
    const tryListen = () => {
      server.once("error", (error: NodeJS.ErrnoException) => {
        if (error.code === "EADDRINUSE" && wanted !== 0 && attempt < wanted + 10) {
          attempt++;
          tryListen();
        } else {
          reject(new Error(`cannot listen on 127.0.0.1:${attempt}: ${error.message}`));
        }
      });
      server.listen(attempt, "127.0.0.1", () => {
        server.removeAllListeners("error");
        const port = (server.address() as AddressInfo).port;
        const url = `http://127.0.0.1:${port}/`;
        resolvePromise({
          server,
          port,
          url,
          close: () => new Promise<void>((done) => server.close(() => done())),
        });
      });
    };
    tryListen();
  });
}

function writePid(workspace: string, url: string): void {
  mkdirSync(join(workspace, DATA_DIR), { recursive: true });
  writeFileSync(pidPath(workspace), `${process.pid}\n${url}\n`);
}

function removePid(workspace: string): void {
  const record = readPid(workspace);
  if (record && record.pid === process.pid) rmSync(pidPath(workspace), { force: true });
}

async function main(): Promise<number> {
  const args = parseCli(process.argv.slice(2), {
    port: { type: "string", default: "4321" },
    site: { type: "string" },
    stop: { type: "boolean" },
    detach: { type: "boolean" },
  });
  if (args.values.help) {
    console.log(USAGE);
    return 0;
  }
  if (!args.positionals[0]) throw Object.assign(new Error("expected <workspace>"), { code: 2 });
  const workspace = requireWorkspace(args.positionals[0]);
  const port = Number(args.values.port);
  if (!Number.isInteger(port) || port < 0 || port > 65535) throw Object.assign(new Error("--port must be an integer from 0 to 65535"), { code: 2 });

  const existing = readPid(workspace);
  const confirmed = existing !== null && (await confirmServer(existing, workspace));
  if (args.values.stop) {
    if (confirmed && existing) {
      process.kill(existing.pid, "SIGTERM");
      console.log(`stopped lingo server ${existing.pid}`);
    } else if (existing && isAlive(existing.pid)) {
      console.log(`no lingo server running; process ${existing.pid} in the stale PID file is something else and was left alone`);
    } else {
      console.log("no lingo server running");
    }
    rmSync(pidPath(workspace), { force: true });
    return 0;
  }
  if (confirmed && existing) {
    console.log(existing.url);
    return 0;
  }
  rmSync(pidPath(workspace), { force: true });
  const site = typeof args.values.site === "string" ? args.values.site : undefined;
  if (args.values.detach) {
    console.log(await detach(workspace, port, site));
    return 0;
  }

  const running = await startServer({ workspace, port, siteDir: site });
  writePid(workspace, running.url);
  const shutdown = () => {
    removePid(workspace);
    running.server.close();
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
  process.on("exit", () => removePid(workspace));
  console.log(running.url);
  return new Promise<number>(() => {
    // Runs until a signal arrives.
  });
}

if (isMain(import.meta.url)) {
  await runCli(main);
}
