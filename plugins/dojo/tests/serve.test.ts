import { test } from "node:test";
import assert from "node:assert/strict";
import { spawn, type ChildProcess } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { request } from "node:http";
import { join } from "node:path";
import { confirmServer, isAlive, readPid, startServer } from "../skills/dojo/scripts/serve.ts";
import { SCRIPTS_DIR, removeDir, runScript, tempWorkspace } from "./helpers.ts";

function startChild(ws: string): Promise<{ child: ChildProcess; url: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [join(SCRIPTS_DIR, "serve.ts"), ws, "--port", "0"], { stdio: ["ignore", "pipe", "pipe"] });
    let out = "";
    let err = "";
    child.stdout!.on("data", (chunk: Buffer) => {
      out += chunk.toString();
      const match = /http:\/\/127\.0\.0\.1:\d+\//.exec(out);
      if (match) resolve({ child, url: match[0] });
    });
    child.stderr!.on("data", (chunk: Buffer) => {
      err += chunk.toString();
    });
    child.on("exit", (code) => reject(new Error(`serve exited early with ${code}: ${err}`)));
    setTimeout(() => reject(new Error(`serve did not print a URL: ${out} ${err}`)), 15000).unref();
  });
}

function waitForExit(child: ChildProcess): Promise<void> {
  return new Promise((resolve) => {
    if (child.exitCode !== null) resolve();
    else child.on("exit", () => resolve());
  });
}

test("serves the site, marks items done through /api/done and rebuilds", async () => {
  const ws = tempWorkspace();
  const { child, url } = await startChild(ws);
  try {
    const record = readPid(ws);
    assert.equal(record?.pid, child.pid);
    assert.equal(record?.url, url);

    const index = await fetch(`${url}index.html`);
    assert.equal(index.status, 200);
    assert.match(index.headers.get("content-type") ?? "", /^text\/html/);
    const indexText = await index.text();
    assert.match(indexText, /data-id="C01" data-status="done">Mark done/);
    // P02 has no file yet, so it gets no button: one click would make next-item skip it.
    assert.doesNotMatch(indexText, /done-button" data-id="P02"/);
    assert.match(indexText, /not generated yet/);
    const css = await fetch(`${url}assets/dojo.css`);
    assert.match(css.headers.get("content-type") ?? "", /^text\/css/);
    assert.equal((await fetch(`${url}nope.html`)).status, 404);
    assert.notEqual((await fetch(`${url}../../etc/passwd`)).status, 200);

    const status = await fetch(`${url}api/status`);
    const items = (await status.json()) as { items: { id: string; status: string; path: string }[] };
    assert.equal(items.items.find((it) => it.id === "P02")?.status, "planned");
    assert.equal(items.items[0].path.startsWith("/"), false, "paths are relative");
    // Requests from another origin, or with a forged Host, are refused.
    const crossSite = await fetch(`${url}api/done`, { method: "POST", headers: { origin: "https://evil.example" }, body: JSON.stringify({ id: "P02" }) });
    assert.equal(crossSite.status, 403);
    // fetch refuses to set Host, so a raw request carries the forged header.
    const forgedHost = await new Promise<number>((resolve, reject) => {
      const req = request(`${url}api/status`, { headers: { host: "evil.example" } }, (res) => {
        res.resume();
        resolve(res.statusCode ?? 0);
      });
      req.on("error", reject);
      req.end();
    });
    assert.equal(forgedHost, 403);
    const sameOrigin = await fetch(`${url}api/status`, { headers: { origin: url.replace(/\/$/, "") } });
    assert.equal(sameOrigin.status, 200);

    const done = await fetch(`${url}api/done`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: "P02" }) });
    assert.equal(done.status, 200);
    const body = (await done.json()) as { ok: boolean; id: string; status: string; done: string };
    const today = new Date().toISOString().slice(0, 10);
    assert.deepEqual(body, { ok: true, id: "P02", status: "done", done: today });
    assert.match(readFileSync(join(ws, "syllabus.md"), "utf8"), new RegExp(`\\| P02 \\| capstone \\| Build a directory watcher \\| 10 \\| done \\| ${today} \\|`));
    // P02 has no file yet, so undoing goes back to planned rather than generated.
    assert.match(await (await fetch(`${url}index.html`)).text(), /data-id="P02" data-status="planned">Mark not done/);

    const undo = await fetch(`${url}api/done`, { method: "POST", body: JSON.stringify({ id: "P02", status: "planned" }) });
    assert.deepEqual(await undo.json(), { ok: true, id: "P02", status: "planned", done: "" });

    const unknown = await fetch(`${url}api/done`, { method: "POST", body: JSON.stringify({ id: "L99" }) });
    assert.equal(unknown.status, 404);
    const garbage = await fetch(`${url}api/done`, { method: "POST", body: "garbage" });
    assert.equal(garbage.status, 400);
    assert.equal((await fetch(`${url}api/done`)).status, 405);

    // A second start prints the existing URL and exits without serving.
    const second = runScript("serve.ts", [ws, "--port", "0"]);
    assert.equal(second.status, 0, second.stderr);
    assert.equal(second.stdout.trim(), url);

    const stop = runScript("serve.ts", [ws, "--stop"]);
    assert.equal(stop.status, 0, stop.stderr);
    assert.match(stop.stdout, /stopped dojo server/);
    await waitForExit(child);
    assert.equal(existsSync(join(ws, ".dojo", "serve.pid")), false);
    assert.equal(isAlive(child.pid!), false);
  } finally {
    if (child.exitCode === null) child.kill("SIGKILL");
    removeDir(ws);
  }
});

test("startServer binds an ephemeral port on 127.0.0.1 and closes cleanly", async () => {
  const ws = tempWorkspace();
  const running = await startServer({ workspace: ws, port: 0 });
  try {
    assert.match(running.url, /^http:\/\/127\.0\.0\.1:\d+\/$/);
    assert.equal(running.port > 0, true);
    const page = await fetch(`${running.url}lessons/L01-what-node-is.html`);
    assert.equal(page.status, 200);
  } finally {
    await running.close();
    removeDir(ws);
  }
});

test("--stop when nothing runs and stale pid files", async () => {
  const ws = tempWorkspace();
  try {
    const stop = runScript("serve.ts", [ws, "--stop"]);
    assert.equal(stop.status, 0);
    assert.match(stop.stdout, /no dojo server running/);
    assert.equal(runScript("serve.ts", ["--help"]).status, 0);
    assert.equal(runScript("serve.ts", [ws, "--port", "99999"]).status, 2);
  } finally {
    removeDir(ws);
  }
});

test("--detach leaves a server running after the command exits, and a second start reuses it", async () => {
  const ws = tempWorkspace();
  try {
    const first = runScript("serve.ts", [ws, "--port", "0", "--detach"]);
    assert.equal(first.status, 0, first.stderr);
    const url = first.stdout.trim();
    assert.match(url, /^http:\/\/127\.0\.0\.1:\d+\/$/);
    const record = readPid(ws);
    assert.equal(record?.url, url);
    const status = (await (await fetch(`${url}api/status`)).json()) as { pid: number; workspace: string };
    assert.equal(status.pid, record?.pid);
    assert.equal((await fetch(url)).status, 200);
    assert.equal(runScript("serve.ts", [ws, "--port", "0", "--detach"]).stdout.trim(), url);
    const stop = runScript("serve.ts", [ws, "--stop"]);
    assert.match(stop.stdout, /stopped dojo server/);
    for (let i = 0; i < 50 && isAlive(record!.pid); i++) await new Promise((r) => setTimeout(r, 100));
    assert.equal(isAlive(record!.pid), false);
  } finally {
    const left = readPid(ws);
    if (left && isAlive(left.pid)) process.kill(left.pid, "SIGKILL");
    removeDir(ws);
  }
});

test("a live PID that is not this workspace's server is never reported or stopped", async () => {
  const ws = tempWorkspace();
  const other = spawn(process.execPath, ["-e", "setTimeout(() => {}, 60000)"], { stdio: "ignore" });
  try {
    writeFileSync(join(ws, ".dojo", "serve.pid"), `${other.pid}\nhttp://127.0.0.1:9/\n`);
    assert.equal(await confirmServer({ pid: other.pid!, url: "http://127.0.0.1:9/" }, ws), false);
    const stop = runScript("serve.ts", [ws, "--stop"]);
    assert.equal(stop.status, 0, stop.stderr);
    assert.match(stop.stdout, /left alone/);
    assert.equal(isAlive(other.pid!), true);
    assert.equal(existsSync(join(ws, ".dojo", "serve.pid")), false);
  } finally {
    other.kill("SIGKILL");
    removeDir(ws);
  }
});
