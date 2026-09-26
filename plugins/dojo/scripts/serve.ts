#!/usr/bin/env node
// Serves the built site on 127.0.0.1 and accepts the done button's request,
// which marks the syllabus row and rebuilds the site.

import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import { existsSync, mkdirSync, readFileSync, statSync, unlinkSync, writeFileSync } from "node:fs";
import { extname, join, resolve, sep } from "node:path";
import type { AddressInfo } from "node:net";
import { buildSite } from "./build-site.ts";
import { isMain, parseCli, runCli } from "./lib/cli.ts";
import { DATE_PATTERN, STATUSES } from "./lib/constants.ts";
import { requireWorkspace } from "./lib/workspace.ts";
import { markItem } from "./mark-done.ts";
import { describeItem, readSyllabus } from "./next-item.ts";

const USAGE = `usage: serve.ts <workspace> [--port 4321] [--site <dir>] [--stop]

Builds the site, then serves it on http://127.0.0.1:<port>/ and prints the URL.
POST /api/done with {"id": "L01"} (optional "status", "date") marks the item
and rebuilds; GET /api/status lists the items. The PID is written to
.dojo/serve.pid; if that process is alive, the existing URL is printed and
nothing new starts. --stop stops the running server. --port 0 picks a free port.`;

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
  return join(workspace, ".dojo", "serve.pid");
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
      if (url.pathname === "/api/status" && req.method === "GET") {
        const syllabus = readSyllabus(workspace);
        sendJson(res, 200, { ok: true, workspace, items: syllabus.items.map((it) => describeItem(workspace, syllabus, it)) });
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
  mkdirSync(join(workspace, ".dojo"), { recursive: true });
  writeFileSync(pidPath(workspace), `${process.pid}\n${url}\n`);
}

function removePid(workspace: string): void {
  const record = readPid(workspace);
  if (record && record.pid === process.pid) unlinkSync(pidPath(workspace));
}

async function main(): Promise<number> {
  const args = parseCli(process.argv.slice(2), {
    port: { type: "string", default: "4321" },
    site: { type: "string" },
    stop: { type: "boolean" },
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
  if (args.values.stop) {
    if (existing && isAlive(existing.pid)) {
      process.kill(existing.pid, "SIGTERM");
      console.log(`stopped dojo server ${existing.pid}`);
    } else {
      console.log("no dojo server running");
    }
    if (existsSync(pidPath(workspace))) unlinkSync(pidPath(workspace));
    return 0;
  }
  if (existing && isAlive(existing.pid)) {
    console.log(existing.url || `dojo server already running as ${existing.pid}`);
    return 0;
  }
  if (existing) unlinkSync(pidPath(workspace));

  const running = await startServer({ workspace, port, siteDir: typeof args.values.site === "string" ? args.values.site : undefined });
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
