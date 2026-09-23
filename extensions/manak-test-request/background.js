const EBIS_LOGIN = "https://www.manakonline.in/MANAK/eBISLogin";
const HOME_URL = "https://www.manakonline.in/MANAK/login";
const TEST_REQUEST =
  "https://www.manakonline.in/MANAK/testRequestGenerationForApplicant";
const RESULT_KIND = "QE_MANAK_TR_RESULT_V1";
const PLAY_STORE = /play\.google\.com|apps\.apple\.com|com\.bis\.app|itunes\.apple\.com/i;
const APP_TAB_URLS = [
  "http://localhost/*",
  "http://127.0.0.1/*",
  "https://qengineering.in/*",
  "https://www.qengineering.in/*",
  "https://*.qengineering.in/*",
  "https://*.up.railway.app/*",
  "https://*.railway.app/*",
];

function isPlayStoreUrl(url) {
  return PLAY_STORE.test(String(url || ""));
}

self.addEventListener("unhandledrejection", (event) => {
  const msg = String((event.reason && event.reason.message) || event.reason || "");
  if (
    /navigation rejected|not focused|could not establish connection|receiving end|no tab with id|frame was removed|debugger/i.test(
      msg,
    )
  ) {
    event.preventDefault();
  }
});

function settle(value) {
  if (value && typeof value.catch === "function") return value.catch(() => undefined);
  return Promise.resolve(value);
}

function closePlayStoreTab(tabId) {
  if (!tabId) return;
  void settle(chrome.tabs.remove(tabId)).catch(() => {});
}

function safeTabUpdate(tabId, props) {
  return settle(chrome.tabs.update(tabId, props));
}

function safeTabCreate(props) {
  return settle(chrome.tabs.create(props));
}

function safeSendTab(tabId, message) {
  return settle(chrome.tabs.sendMessage(tabId, message));
}

chrome.tabs.onCreated.addListener((tab) => {
  if (isPlayStoreUrl(tab.pendingUrl || tab.url || "")) closePlayStoreTab(tab.id);
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  const url = changeInfo.url || tab.url || tab.pendingUrl || "";
  if (isPlayStoreUrl(url)) closePlayStoreTab(tabId);
});

if (chrome.webNavigation && chrome.webNavigation.onCreatedNavigationTarget) {
  chrome.webNavigation.onCreatedNavigationTarget.addListener((details) => {
    if (isPlayStoreUrl(details.url)) closePlayStoreTab(details.tabId);
  });
}

if (chrome.webNavigation && chrome.webNavigation.onBeforeNavigate) {
  chrome.webNavigation.onBeforeNavigate.addListener((details) => {
    if (details.frameId !== 0) return;
    if (isPlayStoreUrl(details.url)) closePlayStoreTab(details.tabId);
  });
}

function arrayBufferToBase64(buf) {
  const bytes = new Uint8Array(buf);
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

async function printTabToPdf(tabId) {
  if (!tabId) return "";
  const target = { tabId };
  try {
    await settle(chrome.debugger.detach(target));
  } catch {
    /* not attached */
  }
  try {
    await chrome.debugger.attach(target, "1.3");
    await new Promise((resolve) => setTimeout(resolve, 400));
    const printed = await chrome.debugger.sendCommand(target, "Page.printToPDF", {
      printBackground: true,
      preferCSSPageSize: true,
      displayHeaderFooter: false,
      paperWidth: 8.27,
      paperHeight: 11.69,
      marginTop: 0.35,
      marginBottom: 0.35,
      marginLeft: 0.35,
      marginRight: 0.35,
    });
    await settle(chrome.debugger.detach(target));
    return printed && printed.data ? printed.data : "";
  } catch {
    await settle(chrome.debugger.detach(target));
    return "";
  }
}

function notifyAppTabs(result) {
  chrome.tabs.query({ url: APP_TAB_URLS }, (tabs) => {
    (tabs || []).forEach((tab) => {
      if (!tab.id) return;
      void safeSendTab(tab.id, { type: "QE_MANAK_RESULT", result });
    });
  });
}

function storePdfResult(partial) {
  chrome.storage.local.get(["pendingFill", "manakResult"], (data) => {
    const pending = data && data.pendingFill;
    const prev = (data && data.manakResult) || {};
    const result = {
      kind: RESULT_KIND,
      sampleId: partial.sampleId || prev.sampleId || (pending && pending.sampleId) || "",
      sample_code: partial.sample_code || prev.sample_code || "",
      qr_code: partial.qr_code || prev.qr_code || (pending && pending.sample && pending.sample.qr_code) || "",
      filledAt: Date.now(),
      pdfName: partial.pdfName || prev.pdfName || "Test_Request.pdf",
      pdfBase64: partial.pdfBase64 || prev.pdfBase64 || "",
    };
    chrome.storage.local.set({ manakResult: result }, () => {
      void chrome.runtime.lastError;
      notifyAppTabs(result);
    });
  });
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (!msg || typeof msg !== "object") return;

  if (msg.type === "QE_MANAK_OPEN_LOGIN") {
    safeTabCreate({ url: EBIS_LOGIN });
    sendResponse({ ok: true });
    return true;
  }

  function ebisLoginHref(userId, password) {
    const id = String(userId || "").trim();
    const pwd = String(password || "").trim();
    if (!id && !pwd) return EBIS_LOGIN;
    try {
      const u = new URL(EBIS_LOGIN);
      if (id) u.searchParams.set("userId", id);
      if (pwd) u.searchParams.set("passwd", pwd);
      return u.toString();
    } catch {
      return EBIS_LOGIN;
    }
  }

  function queryManakTabs() {
    return new Promise((resolve) => {
      chrome.tabs.query({ url: ["https://www.manakonline.in/*", "https://manakonline.in/*"] }, (tabs) => {
        resolve(tabs || []);
      });
    });
  }

  function tabSession(tabId) {
    return safeSendTab(tabId, { type: "QE_MANAK_SESSION" }).then((res) => res || null);
  }

  async function findLoggedInManakTab() {
    const tabs = await queryManakTabs();
    let any = null;
    let pathGuess = null;
    for (const tab of tabs) {
      if (!tab.id) continue;
      const url = String(tab.url || tab.pendingUrl || "");
      const session = await tabSession(tab.id);
      if (session && session.loggedIn) {
        if (!any) any = { tab, session };
        continue;
      }
      if (
        !pathGuess &&
        /manakonline\.in/i.test(url) &&
        !/ebislogin/i.test(url)
      ) {
        pathGuess = {
          tab,
          session: {
            loggedIn: true,
            onTr: /testRequestGenerationForApplicant/i.test(url),
          },
        };
      }
    }
    return any || pathGuess;
  }

  if (msg.type === "QE_MANAK_OPEN_TR") {
    const payload = msg.payload || null;
    const portalUserId = String(msg.portalUserId || payload?.portalUserId || "").trim();
    const portalPassword = String(msg.portalPassword || "").trim();
    const loginUrl =
      typeof msg.loginUrl === "string" && msg.loginUrl.trim()
        ? msg.loginUrl.trim()
        : ebisLoginHref(portalUserId, portalPassword);
    void (async () => {
      const data = await chrome.storage.local.get(["qeManakEnabled"]);
      const on = !data || data.qeManakEnabled !== false;
      const reused = on ? await findLoggedInManakTab() : null;
      const next = on
        ? {
            pendingFill: payload,
            manakResult: null,
            qeManakArmed: true,
            qeManakHomeReady: Boolean(reused),
            qeManakPortal: {
              userId: portalUserId,
              password: portalPassword,
            },
          }
        : { manakResult: null, qeManakArmed: false };
      await chrome.storage.local.set(next);
      if (reused && reused.tab.id) {
        if (reused.session && reused.session.onTr) {
          await safeTabUpdate(reused.tab.id, { active: true });
          await safeSendTab(reused.tab.id, { type: "QE_MANAK_FILL", payload });
        } else {
          await safeTabUpdate(reused.tab.id, { active: true, url: TEST_REQUEST });
        }
        sendResponse({
          ok: true,
          message: "Already logged in. Opening Test Request without a new login.",
        });
        return;
      }
      safeTabCreate({ url: loginUrl });
      sendResponse({
        ok: true,
        message: on
          ? "No Manak session found. Opening eBIS login. Type captcha only."
          : "Extension is OFF. Page opened without auto-fill.",
      });
    })();
    return true;
  }

  if ((msg.type === "QE_MANAK_PDF" || msg.type === "QE_MANAK_RESULT") && msg.result) {
    storePdfResult(msg.result);
    sendResponse({ ok: true });
    return true;
  }

  if (msg.type === "QE_MANAK_PRINT_PDF") {
    const tabId = _sender && _sender.tab && _sender.tab.id;
    const meta = msg.result || {};
    void printTabToPdf(tabId)
      .then((base64) => {
        if (base64) {
          storePdfResult({
            sampleId: meta.sampleId,
            sample_code: meta.sample_code,
            qr_code: meta.qr_code,
            pdfName: meta.pdfName || "Test_Request.pdf",
            pdfBase64: base64,
          });
        }
        sendResponse({ ok: Boolean(base64), base64, name: meta.pdfName || "Test_Request.pdf" });
      })
      .catch(() => sendResponse({ ok: false, base64: "" }));
    return true;
  }
});

if (chrome.downloads && chrome.downloads.onChanged) {
  chrome.downloads.onChanged.addListener((delta) => {
    if (!delta.state || delta.state.current !== "complete") return;
    chrome.downloads.search({ id: delta.id }, async (items) => {
      const item = items && items[0];
      if (!item) return;
      const blob = `${item.url} ${item.referrer || ""} ${item.filename || ""} ${item.mime || ""}`;
      if (!/manakonline\.in/i.test(blob) || !/pdf/i.test(blob)) return;
      try {
        const res = await fetch(item.url);
        const buf = await res.arrayBuffer();
        if (buf.byteLength < 80) return;
        chrome.tabs.query({ url: ["https://www.manakonline.in/*", "https://manakonline.in/*"] }, (tabs) => {
          (tabs || []).forEach((tab) => {
            if (!tab.id) return;
            void safeSendTab(tab.id, {
              type: "QE_MANAK_FETCH_PDF",
              url: item.url,
              filename: (item.filename || "Test_Request.pdf").split(/[/\\]/).pop(),
            });
          });
        });
        storePdfResult({
          pdfName: (item.filename || "Test_Request.pdf").split(/[/\\]/).pop(),
          pdfBase64: arrayBufferToBase64(buf),
        });
      } catch {
        /* page-side capture is the fallback */
      }
    });
  });
}
