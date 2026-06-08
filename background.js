// FeedForge v7 — background (minimal: just toggles the injected sidebar)

chrome.action.onClicked.addListener(async (tab) => {
  try {
    await chrome.tabs.sendMessage(tab.id, { type: "FF_TOGGLE" });
  } catch (_) {
    // Tab might not have content script yet — inject it
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ["sidebar.js"]
    }).catch(() => {});
  }
});

// CSRF helper — chrome.cookies reads httpOnly cookies that document.cookie cannot
chrome.runtime.onMessage.addListener((msg, _s, sendResponse) => {
  if (msg?.type !== "FF_GET_CSRF") return;
  (async () => {
    for (const url of ["https://www.linkedin.com", "https://linkedin.com"]) {
      const c = await chrome.cookies.get({ url, name: "JSESSIONID" }).catch(() => null);
      if (c?.value) { sendResponse({ token: c.value.replace(/^"|"$/g, "") }); return; }
    }
    sendResponse({ token: null });
  })();
  return true;
});
