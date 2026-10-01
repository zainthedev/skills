// lingo site: reveal controls and the done button. No dependencies. Written
// as TypeScript; build-site.ts strips the types into assets/lingo.js, so this
// file must use only syntax type stripping can erase (no enums, namespaces or
// parameter properties).

type NoticeKind = "info" | "error";

interface DoneResponse {
  ok: boolean;
  status?: string;
  done?: string;
  error?: string;
}

const setupReveals = (): void => {
  for (const button of document.querySelectorAll<HTMLButtonElement>(".reveal-toggle[aria-controls]")) {
    const panel = document.getElementById(button.getAttribute("aria-controls") ?? "");
    if (!panel) continue;
    button.addEventListener("click", () => {
      const open = button.getAttribute("aria-expanded") === "true";
      button.setAttribute("aria-expanded", open ? "false" : "true");
      panel.toggleAttribute("hidden", open);
      button.textContent = open ? "Show answer" : "Hide answer";
    });
  }
};

const notice = (button: HTMLButtonElement, text: string, kind: NoticeKind = "info"): void => {
  const el = button.parentElement?.querySelector<HTMLElement>(".done-notice");
  if (!el) return;
  el.textContent = text;
  el.dataset.kind = kind;
  el.removeAttribute("hidden");
};

const markDone = async (id: string, status: string): Promise<DoneResponse> => {
  const response = await fetch("/api/done", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, status }),
  });
  const body = (await response.json()) as DoneResponse;
  if (!response.ok || !body.ok) throw new Error(body.error ?? "the server refused the request");
  return body;
};

const setupDoneButtons = (): void => {
  for (const button of document.querySelectorAll<HTMLButtonElement>(".done-button[data-id]")) {
    button.addEventListener("click", async () => {
      const id = button.dataset.id ?? "";
      const status = button.dataset.status ?? "done";
      if (window.location.protocol === "file:") {
        notice(button, "Marking items done needs the served site. Run /lingo-build to start it, then open the URL it prints.", "error");
        return;
      }
      button.disabled = true;
      try {
        const result = await markDone(id, status);
        // From the end of a page, marking done moves on to the next item.
        const next = result.status === "done" ? button.dataset.next ?? "" : "";
        notice(button, result.status === "done" ? `Marked done ${result.done}. ${next ? "Opening the next item." : "Reloading."}` : `Status set to ${result.status}. Reloading.`);
        window.setTimeout(() => {
          if (next) window.location.href = next;
          else window.location.reload();
        }, 400);
      } catch (error) {
        button.disabled = false;
        const message = error instanceof Error ? error.message : String(error);
        notice(button, `Could not update the syllabus: ${message}. Is the lingo server running? Run /lingo-build.`, "error");
      }
    });
  }
};

const start = (): void => {
  setupReveals();
  setupDoneButtons();
};

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
else start();
