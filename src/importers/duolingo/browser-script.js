/*
 * Duolingo Helper — word collector.
 *
 * Run in the browser console on https://www.duolingo.com/practice-hub/words while signed in.
 * It fetches every learned word from Duolingo's (unofficial) words-list API, then shows a button
 * that opens the app's /import page and hands the words over with window.postMessage.
 *
 * Read-only on Duolingo: it only repeats the request the page itself makes.
 * Set window.DUOLINGO_HELPER_URL before running to target a different app URL.
 * Message types must match src/importers/duolingo/protocol.ts.
 */
(async () => {
  const APP_URL = (window.DUOLINGO_HELPER_URL || "http://localhost:3000").replace(/\/$/, "");
  const APP_ORIGIN = new URL(APP_URL).origin;
  const MSG_READY = "duolingo-helper:ready";
  const MSG_IMPORT = "duolingo-helper:import";
  const MSG_RESULT = "duolingo-helper:result";
  const log = (...args) => console.log("[duolingo-helper]", ...args);

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  /** A message pinned to the top of the page (errors would otherwise hide in the console). */
  function banner(text, color = "#ea2b2b") {
    document.getElementById("duolingo-helper-banner")?.remove();
    const el = document.createElement("div");
    el.id = "duolingo-helper-banner";
    el.textContent = text;
    Object.assign(el.style, {
      position: "fixed", top: "16px", left: "50%", transform: "translateX(-50%)", zIndex: 2147483647,
      maxWidth: "min(90vw, 560px)", padding: "12px 20px", borderRadius: "12px", background: color, color: "#fff",
      font: "bold 15px system-ui, sans-serif", textAlign: "center", boxShadow: "0 4px 12px rgba(0,0,0,.2)",
    });
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 12000);
  }

  function fail(message) {
    banner(`Duolingo Helper: ${message}`);
    throw new Error(message);
  }

  if (!location.pathname.startsWith("/practice-hub/words")) {
    fail("open duolingo.com/practice-hub/words first, then run the script again.");
  }

  // 1. Capture the page's own words-list request. Its body carries the course progress that
  //    Duolingo requires; we reuse it and only change the paging parameters.
  //    The request is triggered by clicking "Load more". If every word is already shown there is
  //    no such button, so we make the words page load again: navigate away and back inside the
  //    app (no reload), and it fetches its first page anew.
  async function captureRequest() {
    const original = window.fetch;
    let resolveCapture;
    const captured = new Promise((resolve) => (resolveCapture = resolve));
    window.fetch = function (input, init) {
      const url = typeof input === "string" ? input : input.url;
      if (/\/learned-lexemes\?/.test(url) && init && init.body) {
        resolveCapture({ url, headers: init.headers, body: init.body });
      }
      return original.apply(this, arguments);
    };

    try {
      const loadMore = [...document.querySelectorAll("button, li, [role=button]")].find((el) =>
        /load more/i.test(el.textContent || ""),
      );
      if (loadMore) {
        loadMore.click();
      } else {
        log('No "Load more" button (all words already shown): reloading the word list in place.');
        const here = location.pathname + location.search;
        history.pushState(null, "", "/practice-hub");
        window.dispatchEvent(new PopStateEvent("popstate"));
        await sleep(500);
        history.pushState(null, "", here);
        window.dispatchEvent(new PopStateEvent("popstate"));
      }
      const result = await Promise.race([captured, sleep(15000).then(() => null)]);
      if (!result) {
        fail("couldn't catch Duolingo's word list request. Reload this page, then run the script again.");
      }
      return result;
    } finally {
      window.fetch = original;
    }
  }

  const captured = await captureRequest();
  const pageUrl = new URL(captured.url, location.origin);
  const courseMatch = pageUrl.pathname.match(/\/courses\/([^/]+)\/([^/]+)\//);
  if (!courseMatch) fail(`unexpected words-list URL: ${pageUrl.pathname}`);
  const course = `${courseMatch[1]}-${courseMatch[2]}`;
  log(`Captured request for course ${course}, sorted by ${pageUrl.searchParams.get("sortBy")}.`);

  // 2. Page through the full list.
  const words = [];
  let startIndex = 0;
  let total = null;
  for (let page = 0; startIndex != null && page < 500; page++) {
    pageUrl.searchParams.set("startIndex", String(startIndex));
    const res = await fetch(pageUrl, {
      method: "POST",
      headers: captured.headers,
      body: captured.body,
      credentials: "include",
    });
    if (!res.ok) fail(`Duolingo returned ${res.status} while fetching words (at ${startIndex}).`);
    const json = await res.json();
    for (const w of json.learnedLexemes || []) {
      words.push({ text: w.text, translations: w.translations || [], audioURL: w.audioURL || null });
    }
    total = json.pagination?.totalLexemes ?? total;
    startIndex = json.pagination?.nextStartIndex ?? null;
    log(`Fetched ${words.length}${total != null ? ` / ${total}` : ""} words`);
  }
  if (total != null && words.length !== total) {
    console.warn(`[duolingo-helper] Expected ${total} words but got ${words.length}.`);
  }

  const payload = { source: "duolingo", course, words };
  window.__duolingoHelperPayload = payload;

  // 3. Hand over to the app. Opening a window needs a real click, so show a button.
  document.getElementById("duolingo-helper-banner")?.remove();
  document.getElementById("duolingo-helper-send")?.remove();
  const button = document.createElement("button");
  button.id = "duolingo-helper-send";
  button.textContent = `Send ${words.length} words to Duolingo Helper`;
  Object.assign(button.style, {
    position: "fixed", top: "16px", left: "50%", transform: "translateX(-50%)", zIndex: 2147483647,
    padding: "12px 20px", borderRadius: "12px", border: "none", background: "#58cc02", color: "#fff",
    font: "bold 16px system-ui, sans-serif", boxShadow: "0 4px 0 #46a302", cursor: "pointer",
  });
  document.body.appendChild(button);

  const done = new Promise((resolve) => {
    let popup = null;
    function onMessage(event) {
      if (event.origin !== APP_ORIGIN || !popup || event.source !== popup) return;
      if (event.data?.type === MSG_READY) {
        popup.postMessage({ type: MSG_IMPORT, payload }, APP_ORIGIN);
        button.textContent = "Saving…";
      } else if (event.data?.type === MSG_RESULT) {
        window.removeEventListener("message", onMessage);
        const r = event.data.result;
        button.textContent = event.data.ok
          ? `Imported: ${r.inserted} new, ${r.updated} updated`
          : `Import failed: ${event.data.error}`;
        button.style.background = event.data.ok ? "#58cc02" : "#ea2b2b";
        setTimeout(() => button.remove(), 8000);
        resolve(event.data);
      }
    }
    window.addEventListener("message", onMessage);
    button.addEventListener("click", () => {
      popup = window.open(`${APP_URL}/import`, "duolingo-helper-import");
      button.textContent = "Waiting for Duolingo Helper…";
    });
  });

  log(`Ready: ${words.length} words. Click the green button at the top of the page.`);
  window.__duolingoHelperResult = done;
  return { course, words: words.length, total };
})();
