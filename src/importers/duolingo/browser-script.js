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

  if (!location.pathname.startsWith("/practice-hub/words")) {
    throw new Error("Open https://www.duolingo.com/practice-hub/words first.");
  }

  // 1. Capture the page's own words-list request. Its body carries the course progress that
  //    Duolingo requires; we reuse it and only change the paging parameters.
  function captureRequest() {
    return new Promise((resolve, reject) => {
      const original = window.fetch;
      const restore = () => (window.fetch = original);
      const timer = setTimeout(() => {
        restore();
        reject(new Error("Timed out waiting for Duolingo's word list request. Reload the page and try again."));
      }, 15000);

      window.fetch = function (input, init) {
        const url = typeof input === "string" ? input : input.url;
        if (/\/learned-lexemes\?/.test(url) && init && init.body) {
          clearTimeout(timer);
          restore();
          resolve({ url, headers: init.headers, body: init.body });
        }
        return original.apply(this, arguments);
      };

      const loadMore = [...document.querySelectorAll("button, li, [role=button]")].find((el) =>
        /load more/i.test(el.textContent || ""),
      );
      if (!loadMore) {
        clearTimeout(timer);
        restore();
        reject(new Error('No "Load more" button found. Reload the page (so only the first words are shown) and run again.'));
        return;
      }
      loadMore.click();
    });
  }

  const captured = await captureRequest();
  const pageUrl = new URL(captured.url, location.origin);
  const courseMatch = pageUrl.pathname.match(/\/courses\/([^/]+)\/([^/]+)\//);
  if (!courseMatch) throw new Error(`Unexpected words-list URL: ${pageUrl.pathname}`);
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
    if (!res.ok) throw new Error(`Duolingo returned ${res.status} at startIndex ${startIndex}`);
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
