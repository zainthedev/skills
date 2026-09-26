// dojo site: reveal controls and the done button. No dependencies.
(function () {
  "use strict";

  function setupReveals() {
    var toggles = document.querySelectorAll(".reveal-toggle[aria-controls]");
    Array.prototype.forEach.call(toggles, function (button) {
      var panel = document.getElementById(button.getAttribute("aria-controls"));
      if (!panel) return;
      button.addEventListener("click", function () {
        var open = button.getAttribute("aria-expanded") === "true";
        button.setAttribute("aria-expanded", open ? "false" : "true");
        if (open) {
          panel.setAttribute("hidden", "");
        } else {
          panel.removeAttribute("hidden");
        }
        button.textContent = open ? "Show answer" : "Hide answer";
      });
    });
  }

  function notice(button, text, kind) {
    var el = button.parentNode ? button.parentNode.querySelector(".done-notice") : null;
    if (!el) return;
    el.textContent = text;
    el.setAttribute("data-kind", kind || "info");
    el.removeAttribute("hidden");
  }

  function setupDoneButtons() {
    var buttons = document.querySelectorAll(".done-button[data-id]");
    Array.prototype.forEach.call(buttons, function (button) {
      button.addEventListener("click", function () {
        var id = button.getAttribute("data-id");
        var status = button.getAttribute("data-status") || "done";
        if (window.location.protocol === "file:") {
          notice(button, "Marking items done needs the served site. Run /dojo:build to start it, then open the URL it prints.", "error");
          return;
        }
        button.disabled = true;
        fetch("/api/done", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: id, status: status }),
        })
          .then(function (response) {
            return response.json().then(function (body) {
              return { ok: response.ok, body: body };
            });
          })
          .then(function (result) {
            if (!result.ok || !result.body.ok) {
              throw new Error((result.body && result.body.error) || "the server refused the request");
            }
            notice(button, result.body.status === "done" ? "Marked done " + result.body.done + ". Reloading." : "Status set to " + result.body.status + ". Reloading.");
            window.setTimeout(function () {
              window.location.reload();
            }, 400);
          })
          .catch(function (error) {
            button.disabled = false;
            notice(button, "Could not update the syllabus: " + error.message + ". Is the dojo server running? Run /dojo:build.", "error");
          });
      });
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      setupReveals();
      setupDoneButtons();
    });
  } else {
    setupReveals();
    setupDoneButtons();
  }
})();
