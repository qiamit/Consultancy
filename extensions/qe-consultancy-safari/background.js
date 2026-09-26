const STORAGE_KEY = "copyPasteBypassEnabled";
const STORAGE_KEY_CTRL = "ctrlKeyBypassEnabled";
const EBIS_LOGIN = "https://www.manakonline.in/MANAK/eBISLogin";
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

const hasDebugger = Boolean(chrome.debugger);
const hasDownloads = Boolean(chrome.downloads && chrome.downloads.onChanged);
const hasWebNavigation = Boolean(chrome.webNavigation);
let pendingDownloadCapture = null;
let isCodeFetchActive = false;
const MANUALS_API = "https://standardsadmin.bis.gov.in/review-service/getProductManualStandardsList";
const MANUALS_CDN = "https://bmqsdqljvwgm.compat.objectstorage.ap-mumbai-1.oraclecloud.com/";

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

chrome.runtime.onInstalled.addListener(async () => {
  const stored = await chrome.storage.sync.get([STORAGE_KEY, STORAGE_KEY_CTRL]);
  const updates = {};
  if (typeof stored[STORAGE_KEY] !== "boolean") {
    updates[STORAGE_KEY] = true;
  }
  if (typeof stored[STORAGE_KEY_CTRL] !== "boolean") {
    updates[STORAGE_KEY_CTRL] = true;
  }
  if (Object.keys(updates).length) {
    await chrome.storage.sync.set(updates);
  }
});

chrome.tabs.onCreated.addListener((tab) => {
  if (isPlayStoreUrl(tab.pendingUrl || tab.url || "")) closePlayStoreTab(tab.id);
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  const url = changeInfo.url || tab.url || tab.pendingUrl || "";
  if (isPlayStoreUrl(url)) closePlayStoreTab(tabId);
  if (!/manakonline\.in/i.test(url)) return;
  if (/knowfees/i.test(url)) return;
  if (changeInfo.status !== "complete" && !/ebislogin/i.test(url)) return;
  const apply = (userId, password) => {
    if (userId || password) scheduleLoginFill(tabId, userId, password);
  };
  if (lastPortal.userId || lastPortal.password) {
    apply(lastPortal.userId, lastPortal.password);
    return;
  }
  chrome.storage.local.get(["qeManakPortal"], (data) => {
    const portal = (data && data.qeManakPortal) || {};
    apply(portal.userId, portal.password);
  });
});

if (hasWebNavigation && chrome.webNavigation.onCreatedNavigationTarget) {
  chrome.webNavigation.onCreatedNavigationTarget.addListener((details) => {
    if (isPlayStoreUrl(details.url)) closePlayStoreTab(details.tabId);
  });
}

if (hasWebNavigation && chrome.webNavigation.onBeforeNavigate) {
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
  if (!tabId || !hasDebugger) return "";
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

async function broadcastBypass(type, enabled) {
  const tabs = await chrome.tabs.query({});
  await Promise.all(
    tabs
      .filter((tab) => typeof tab.id === "number")
      .map((tab) => chrome.tabs.sendMessage(tab.id, { type, enabled }).catch(() => null)),
  );
}

async function runBulkFillOnActiveTab(fieldName, value) {
  const tab = await getActiveTab();
  if (!tab || typeof tab.id !== "number") {
    return { ok: false, error: "No active tab found." };
  }
  if (!isScriptableTabUrl(tab.url)) {
    return {
      ok: false,
      error: "This page is restricted. Open a regular website tab and try again.",
    };
  }

  const payload = { type: "RUN_BULK_FILL", fieldName, value };
  try {
    return await chrome.tabs.sendMessage(tab.id, payload);
  } catch (_initialError) {
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id, allFrames: true },
        files: ["content-bypass.js"],
      });
      return await chrome.tabs.sendMessage(tab.id, payload);
    } catch (error) {
      return {
        ok: false,
        error: "Could not connect to the page. Refresh the tab and try again. " + String(error),
      };
    }
  }
}

async function getActiveTab() {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  return tabs[0];
}

let lastOpenKey = "";
let lastOpenAt = 0;
let lastPortal = { userId: "", password: "" };
let lastIsCodeAppTabId = 0;
const fillSentAt = new Map();

function rememberPortal(userId, password) {
  lastPortal = {
    userId: String(userId || "").trim(),
    password: String(password || "").trim(),
  };
}

function injectMainWorldLogin(tabId, userId, password) {
  if (!tabId || !chrome.scripting || !chrome.scripting.executeScript) return;
  void settle(
    chrome.scripting.executeScript({
      target: { tabId },
      world: "MAIN",
      func: (id, pwd) => {
        document.dispatchEvent(
          new CustomEvent("qe-manak-fill-login", {
            bubbles: true,
            detail: { userId: id, password: pwd },
          }),
        );
        const $ = window.jQuery || window.$;
        const user = document.getElementById("InputEmail");
        const pass = document.getElementById("InputPassword");
        if ($ && user && id) $(user).val(id).trigger("input").trigger("change");
        if ($ && pass && pwd) $(pass).val(pwd).trigger("input").trigger("change");
      },
      args: [userId, password],
    }),
  );
}

function scheduleLoginFill(tabId, userId, password) {
  rememberPortal(userId, password);
  if (!tabId || (!userId && !password)) return;
  const key = `${tabId}|${userId}|${password}`;
  const now = Date.now();
  if (now - (fillSentAt.get(key) || 0) < 600) return;
  fillSentAt.set(key, now);
  const tryFill = () => {
    void safeSendTab(tabId, {
      type: "QE_MANAK_FILL_LOGIN",
      userId,
      password,
    });
    injectMainWorldLogin(tabId, userId, password);
  };
  [400, 900, 1600, 2800, 4500, 7000].forEach((ms) => setTimeout(tryFill, ms));
}

function isScriptableTabUrl(url) {
  if (!url) return false;
  return !(
    url.startsWith("chrome://") ||
    url.startsWith("chrome-extension://") ||
    url.startsWith("edge://") ||
    url.startsWith("brave://") ||
    url.startsWith("about:") ||
    url.startsWith("safari-web-extension://") ||
    url.startsWith("view-source:")
  );
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
    if (!pathGuess && /manakonline\.in/i.test(url) && !/ebislogin/i.test(url)) {
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

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || typeof message.type !== "string") return;

  if (message.type === "QE_IS_CODE_PING") {
    sendResponse({ ok: true, extension: "QE Consultancy" });
    return true;
  }

  if (message.type === "QE_BSB_LOGIN_CLICK") {
    const tabId = sender.tab && sender.tab.id;
    if (!tabId || !chrome.scripting || !chrome.scripting.executeScript) {
      sendResponse({ ok: false });
      return true;
    }
    void chrome.scripting
      .executeScript({
        target: { tabId },
        world: "MAIN",
        func: (email, password, captcha) => {
          if (window.__qeBsbMainClicked) return { ok: true, skipped: true };
          const user = document.getElementById("T1_txtUser");
          const pass = document.getElementById("T1_txtPass");
          const cap = document.getElementById("T1_captcha");
          const salt = document.getElementById("T1_HDSalt");
          if (!user || !pass || !cap) return { ok: false, reason: "fields" };
          if (!salt || !String(salt.value || "").trim()) return { ok: false, reason: "salt" };
          user.value = String(email || "");
          pass.value = String(password || "");
          cap.value = String(captcha || "");
          const btn = document.getElementById("T1_btn_submit");
          if (!btn) return { ok: false, reason: "button" };
          window.__qeBsbMainClicked = true;
          btn.click();
          return { ok: true };
        },
        args: [String(message.email || ""), String(message.password || ""), String(message.captcha || "")],
      })
      .then((results) => {
        const out = results && results[0] && results[0].result;
        sendResponse(out || { ok: false });
      })
      .catch(() => sendResponse({ ok: false }));
    return true;
  }

  if (message.type === "QE_CAPTURE_NEXT_DOWNLOAD") {
    const tabId = sender.tab && sender.tab.id;
    if (pendingDownloadCapture && pendingDownloadCapture.timer) {
      clearTimeout(pendingDownloadCapture.timer);
    }
    pendingDownloadCapture = {
      tabId,
      wantedName: String(message.name || "document.pdf"),
      sendResponse,
      timer: setTimeout(() => {
        if (pendingDownloadCapture && pendingDownloadCapture.sendResponse === sendResponse) {
          pendingDownloadCapture.sendResponse({ ok: false });
          pendingDownloadCapture = null;
        }
      }, 25000),
    };
    return true;
  }

  if (message.type === "QE_IS_CODE_PORTAL_RESULT" && message.result) {
    notifyIsCodeApp(lastIsCodeAppTabId, "QE_IS_CODE_FILL", {
      payload: {
        fields: message.result.fields || {},
        files: message.result.files || [],
        notes: message.result.notes || [],
        partial: true,
        done: false,
      },
    });
    sendResponse({ ok: true });
    return true;
  }

  if (message.type === "QE_CAPTCHA_AI") {
    void (async () => {
      notifyIsCodeApp(lastIsCodeAppTabId, "QE_IS_CODE_PROGRESS", {
        message: "Grok / QE Assistant is reading the security image…",
      });
      const tabs = await chrome.tabs.query({ url: APP_TAB_URLS });
      const ordered = [
        ...tabs.filter((tab) => tab.id === lastIsCodeAppTabId),
        ...tabs.filter((tab) => tab.id !== lastIsCodeAppTabId),
      ];
      const requestId = message.requestId || `cap-${Date.now()}`;
      if (ordered.length === 0) {
        notifyIsCodeApp(lastIsCodeAppTabId, "QE_IS_CODE_PROGRESS", {
          message: "Open the Consultancy dashboard tab so Grok can read the security image.",
        });
        sendResponse({ text: "" });
        return;
      }
      for (const tab of ordered) {
        if (!tab.id) continue;
        const res = await chrome.tabs
          .sendMessage(tab.id, {
            type: "QE_CAPTCHA_AI",
            image: message.image || "",
            requestId,
          })
          .catch(() => null);
        if (res && res.text) {
          sendResponse({ text: String(res.text) });
          return;
        }
      }
      sendResponse({ text: "" });
    })();
    return true;
  }

  if (message.type === "GET_BYPASS_STATE") {
    chrome.storage.sync
      .get([STORAGE_KEY, STORAGE_KEY_CTRL])
      .then((stored) => {
        sendResponse({
          enabled: stored[STORAGE_KEY] !== false,
          ctrlKeyEnabled: stored[STORAGE_KEY_CTRL] !== false,
        });
      })
      .catch(() => sendResponse({ enabled: true, ctrlKeyEnabled: true }));
    return true;
  }

  if (message.type === "SET_BYPASS_STATE") {
    const enabled = Boolean(message.enabled);
    chrome.storage.sync
      .set({ [STORAGE_KEY]: enabled })
      .then(async () => {
        await broadcastBypass("BYPASS_STATE_CHANGED", enabled);
        sendResponse({ ok: true, enabled });
      })
      .catch((error) => sendResponse({ ok: false, error: String(error) }));
    return true;
  }

  if (message.type === "SET_CTRL_BYPASS_STATE") {
    const enabled = Boolean(message.enabled);
    chrome.storage.sync
      .set({ [STORAGE_KEY_CTRL]: enabled })
      .then(async () => {
        await broadcastBypass("CTRL_BYPASS_STATE_CHANGED", enabled);
        sendResponse({ ok: true, enabled });
      })
      .catch((error) => sendResponse({ ok: false, error: String(error) }));
    return true;
  }

  if (message.type === "RUN_BULK_FILL") {
    runBulkFillOnActiveTab(message.fieldName, message.value)
      .then((result) => sendResponse(result))
      .catch((error) => sendResponse({ ok: false, error: String(error) }));
    return true;
  }

  if (message.type === "QE_MANAK_OPEN_LOGIN") {
    safeTabCreate({ url: EBIS_LOGIN });
    sendResponse({ ok: true });
    return true;
  }

  if (message.type === "QE_MANAK_OPEN_TR") {
    const payload = message.payload || null;
    const portalUserId = String(message.portalUserId || payload?.portalUserId || "").trim();
    const portalPassword = String(message.portalPassword || payload?.portalPassword || "").trim();
    rememberPortal(portalUserId, portalPassword);
    const openKey = [
      message.loginOnly ? "login" : "tr",
      portalUserId,
      (payload && payload.sampleId) || "",
    ].join("|");
    const now = Date.now();
    if (openKey === lastOpenKey && now - lastOpenAt < 2500) {
      sendResponse({ ok: true, message: "Already opening Manak." });
      return true;
    }
    lastOpenKey = openKey;
    lastOpenAt = now;
    const loginUrl =
      typeof message.loginUrl === "string" && message.loginUrl.trim()
        ? message.loginUrl.trim()
        : ebisLoginHref(portalUserId, portalPassword);
    void (async () => {
      const data = await chrome.storage.local.get(["qeManakEnabled"]);
      const on = !data || data.qeManakEnabled !== false;
      if (message.loginOnly) {
        await chrome.storage.local.set({
          pendingFill: null,
          qeManakArmed: true,
          qeManakHomeReady: false,
          qeManakPortal: {
            userId: portalUserId,
            password: portalPassword,
          },
        });
        const created = await safeTabCreate({ url: loginUrl });
        if (created && created.id) {
          scheduleLoginFill(created.id, portalUserId, portalPassword);
        }
        sendResponse({
          ok: true,
          message: on
            ? "Opening eBIS login. User ID / Password will be filled. Type captcha only."
            : "Extension is OFF. Page opened without auto-fill.",
        });
        return;
      }
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
      const created = await safeTabCreate({ url: loginUrl });
      if (created && created.id) {
        scheduleLoginFill(created.id, portalUserId, portalPassword);
      }
      sendResponse({
        ok: true,
        message: on
          ? "No Manak session found. Opening eBIS login. Type captcha only."
          : "Extension is OFF. Page opened without auto-fill.",
      });
    })();
    return true;
  }

  if ((message.type === "QE_MANAK_PDF" || message.type === "QE_MANAK_RESULT") && message.result) {
    storePdfResult(message.result);
    sendResponse({ ok: true });
    return true;
  }

  if (message.type === "QE_IS_CODE_FETCH") {
    const appTabId = sender && sender.tab && sender.tab.id;
    lastIsCodeAppTabId = appTabId || lastIsCodeAppTabId;
    const isNumber = String(message.isNumber || "").trim();
    void runIsCodeFetch(appTabId, isNumber)
      .then(() => sendResponse({ ok: true }))
      .catch((error) => sendResponse({ ok: false, error: String(error) }));
    return true;
  }

  if (message.type === "QE_MANAK_PRINT_PDF") {
    const tabId = sender && sender.tab && sender.tab.id;
    const meta = message.result || {};
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
        sendResponse({
          ok: Boolean(base64),
          base64,
          name: meta.pdfName || "Test_Request.pdf",
        });
      })
      .catch(() => sendResponse({ ok: false, base64: "" }));
    return true;
  }
});

function notifyIsCodeApp(tabId, type, extra) {
  if (!tabId) return;
  void safeSendTab(tabId, { type, ...(extra || {}) });
}

function waitTabComplete(tabId, timeoutMs) {
  return new Promise((resolve) => {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      chrome.tabs.onUpdated.removeListener(onUpdated);
      resolve();
    };
    const timer = setTimeout(finish, timeoutMs || 40000);
    function onUpdated(id, info) {
      if (id === tabId && info.status === "complete") {
        clearTimeout(timer);
        finish();
      }
    }
    chrome.tabs.onUpdated.addListener(onUpdated);
  });
}

async function injectIsFetch(tabId) {
  if (!chrome.scripting || !chrome.scripting.executeScript) return;
  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ["captcha-assist.js", "is-code-fetch.js"],
    });
  } catch {
    /* page may already have the scripts */
  }
}

async function runPortalJob(appTabId, url, site, isNumber, creds) {
  if (site === "manuals") {
    notifyIsCodeApp(appTabId, "QE_IS_CODE_PROGRESS", {
      message: "Product Manual: reading the PDF in the extension (no computer download)…",
    });
    return fetchProductManualInBackground(isNumber);
  }
  notifyIsCodeApp(appTabId, "QE_IS_CODE_PROGRESS", {
    message: `Opening ${site}…`,
  });
  const needsCaptcha = site === "knowfees" || site === "bsbedge";
  const tab = await safeTabCreate({ url, active: true });
  if (!tab || !tab.id) return { fields: {}, files: [], notes: [`Could not open ${site}.`] };
  let res = null;
  try {
    await waitTabComplete(tab.id, 45000);
    await new Promise((r) => setTimeout(r, 2200));
    if (needsCaptcha && chrome.scripting && chrome.scripting.executeScript) {
      try {
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          world: "MAIN",
          func: () => {
            window.alert = function () {};
          },
        });
      } catch {
        /* Safari / older engines */
      }
    }
    for (let hop = 0; hop < 4; hop += 1) {
      res = null;
      for (let attempt = 0; attempt < 10 && !res; attempt += 1) {
        if (attempt === 2 || attempt === 6) await injectIsFetch(tab.id);
        res = await chrome.tabs.sendMessage(tab.id, {
          type: "QE_IS_CODE_RUN",
          site,
          isNumber,
          creds: creds || {},
        }).catch(() => null);
        if (!res) await new Promise((r) => setTimeout(r, 600));
      }
      const nextUrl = res && res.result && res.result.navigate;
      if (!nextUrl) break;
      notifyIsCodeApp(appTabId, "QE_IS_CODE_PROGRESS", {
        message: "Opening standard details…",
      });
      await safeTabUpdate(tab.id, { url: nextUrl });
      await waitTabComplete(tab.id, 45000);
      await new Promise((r) => setTimeout(r, 2200));
    }
    if (res && res.result) return res.result;
    if (res && res.error) return { fields: {}, files: [], notes: [`${site}: ${res.error}`] };
    return { fields: {}, files: [], notes: [`${site}: no response. Reload QE Consultancy 2.2.7.`] };
  } finally {
    const keep = Boolean(res && res.result && res.result.keepTab) || (needsCaptcha && !(res && res.result));
    if (!keep) void settle(chrome.tabs.remove(tab.id));
  }
}

function parseIsDoc(isNumber) {
  const match = String(isNumber || "").match(/(?:IS[\s/]*)?(\d{2,5})(?:\s*[:()\-]\s*(\d{4}))?/i);
  return {
    doc: match ? match[1] : String(isNumber || "").replace(/\D/g, ""),
    year: match && match[2] ? match[2] : "",
    display: match ? `IS ${match[1]}` : String(isNumber || "").trim(),
  };
}

function parseProductManualNumber(text) {
  const compact = String(text || "").replace(/\s+/g, " ");
  const match = compact.match(
    /PM\s*\/\s*IS\s*\d{2,5}(?:\s*\([^)]+\))?(?:\s*\/\s*[A-Za-z0-9.-]+){0,5}/i,
  );
  if (!match) return "";
  return match[0]
    .replace(/\s*\/\s*/g, "/")
    .replace(/\s+/g, " ")
    .replace(/PM\/IS/i, "PM/IS")
    .trim();
}

async function extractPmFromPdfBytes(bytes) {
  try {
    const raw = new TextDecoder("latin1").decode(bytes);
    const chunks = [raw];
    const re = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
    let match = re.exec(raw);
    while (match) {
      let payload = match[1];
      if (payload.startsWith("\r\n")) payload = payload.slice(2);
      else if (payload.startsWith("\n")) payload = payload.slice(1);
      const u8 = new Uint8Array(payload.length);
      for (let i = 0; i < payload.length; i += 1) u8[i] = payload.charCodeAt(i);
      for (const format of ["deflate", "deflate-raw"]) {
        try {
          const stream = new Blob([u8]).stream().pipeThrough(new DecompressionStream(format));
          const dec = new Uint8Array(await new Response(stream).arrayBuffer());
          chunks.push(new TextDecoder("latin1").decode(dec));
          break;
        } catch {
          /* next */
        }
      }
      match = re.exec(raw);
    }
    const inflated = chunks.join("\n");
    const literals = [];
    const litRe = /\((?:\\.|[^\\)])+\)/g;
    let lit = litRe.exec(inflated);
    while (lit) {
      literals.push(lit[0].slice(1, -1).replace(/\\n/g, " ").replace(/\\(.)/g, "$1"));
      lit = litRe.exec(inflated);
    }
    return parseProductManualNumber(`${literals.join("")} ${inflated}`);
  } catch {
    return "";
  }
}

async function fetchProductManualInBackground(isNumber) {
  const is = parseIsDoc(isNumber);
  try {
    const res = await fetch(MANUALS_API, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ searchTerm: is.doc }),
    });
    if (!res.ok) {
      return { fields: { is_number: is.display }, files: [], notes: ["Product Manual: list request failed."] };
    }
    const json = await res.json();
    const rows = Array.isArray(json && json.data) ? json.data : [];
    const exact = rows.find((row) =>
      new RegExp(`^IS\\s*${is.doc}(?:\\s*[:].*)?$`, "i").test(String(row.standardNumber || "").trim()),
    );
    const row = exact || rows.find((item) => new RegExp(`(?:^|\\s)IS\\s*${is.doc}(?!\\d)`, "i").test(item.standardNumber || ""));
    if (!row || !row.filename) {
      return { fields: { is_number: is.display }, files: [], notes: ["Product Manual: matching file not found."] };
    }
    const url = /^https?:/i.test(row.filename)
      ? row.filename
      : `${MANUALS_CDN}${String(row.filename).replace(/^\/+/, "")}`;
    const pdfRes = await fetch(url);
    if (!pdfRes.ok) {
      return { fields: { is_number: is.display }, files: [], notes: ["Product Manual: file fetch failed."] };
    }
    const buf = await pdfRes.arrayBuffer();
    if (buf.byteLength < 80) {
      return { fields: { is_number: is.display }, files: [], notes: ["Product Manual: empty file."] };
    }
    const bytes = new Uint8Array(buf);
    const pm = await extractPmFromPdfBytes(bytes);
    return {
      fields: {
        is_number: is.display,
        ...(pm ? { product_manual_number: pm } : {}),
      },
      files: [
        {
          name: `IS_${is.doc}_Product_Manual.pdf`,
          mime: "application/pdf",
          base64: arrayBufferToBase64(buf),
        },
      ],
      notes: pm
        ? [`Product Manual attached. PM Number ${pm} filled.`]
        : ["Product Manual attached to IS Code Related Files."],
    };
  } catch (error) {
    return {
      fields: { is_number: parseIsDoc(isNumber).display },
      files: [],
      notes: [`Product Manual: ${String(error && error.message ? error.message : error)}`],
    };
  }
}

function limsUrl(isNumber) {
  const match = String(isNumber || "").match(/(?:IS[\s/]*)?(\d{2,5})(?:\s*[:()\-]\s*(\d{4}))?/i);
  const doc = match ? match[1] : String(isNumber || "").replace(/\D/g, "");
  const year = match && match[2] ? match[2] : "";
  const q = new URL("https://lims.bis.gov.in/home/search_is_number/");
  q.searchParams.set("lab__lab_name__icontains", "");
  q.searchParams.set("is_number__doc_no", doc);
  q.searchParams.set("is_number__part", "");
  q.searchParams.set("is_number__section", "");
  q.searchParams.set("is_number__year", year);
  q.searchParams.set("is_title", "");
  return q.toString();
}

async function runIsCodeFetch(appTabId, isNumber) {
  if (!isNumber) {
    notifyIsCodeApp(appTabId, "QE_IS_CODE_FILL", {
      payload: { notes: ["Type an IS Number first."] },
    });
    return;
  }
  const stored = await chrome.storage.local.get(["qeBsbedgeEmail", "qeBsbedgePassword"]);
  const creds = {
    email: String(stored.qeBsbedgeEmail || "").trim(),
    password: String(stored.qeBsbedgePassword || ""),
  };
  const merged = { fields: { is_number: parseIsDoc(isNumber).display }, files: [], notes: [] };
  const doc = parseIsDoc(isNumber).doc;
  const jobs = [
    [null, "manuals"],
    [
      `https://standards.bis.gov.in/website/know-your-standards?searchTerm=${encodeURIComponent(doc || isNumber)}`,
      "details",
    ],
    [limsUrl(isNumber), "lims"],
    ["https://www.manakonline.in/MANAK/knowfees", "knowfees"],
    ["https://standardsbis.bsbedge.com/BIS_Login", "bsbedge"],
  ];
  isCodeFetchActive = true;
  try {
    for (const [url, site] of jobs) {
      notifyIsCodeApp(appTabId, "QE_IS_CODE_PROGRESS", {
        message:
          site === "manuals"
            ? "1/5 Product Manual: attaching the PDF and PM Number…"
            : site === "details"
              ? "2/5 Know Your Standards: revision year, reaffirmation, amendment, aspect, title…"
              : site === "lims"
                ? "3/5 LIMS: highest testing charges…"
                : site === "knowfees"
                  ? "4/5 Know Fees: type the captcha. Unit and marking fees follow."
                  : "5/5 BSB Edge: login first, then search, then the standard PDF.",
      });
      const part = await runPortalJob(appTabId, url, site, isNumber, creds);
      await new Promise((r) => setTimeout(r, 800));
      Object.assign(merged.fields, part.fields || {});
      merged.files.push(...(part.files || []));
      merged.notes.push(...(part.notes || []));
      notifyIsCodeApp(appTabId, "QE_IS_CODE_FILL", {
        payload: {
          fields: { ...merged.fields },
          files: part.files || [],
          notes: part.notes || [],
          partial: true,
          done: false,
        },
      });
    }
    notifyIsCodeApp(appTabId, "QE_IS_CODE_FILL", {
      payload: { fields: merged.fields, notes: merged.notes, done: true },
    });
  } finally {
    isCodeFetchActive = false;
  }
}

if (hasDownloads) {
  chrome.downloads.onCreated.addListener((item) => {
    if (!isCodeFetchActive) return;
    const blob = `${item.url || ""} ${item.finalUrl || ""} ${item.filename || ""}`;
    if (!/bsbedge|standards\.bis\.gov|product.manual|oraclecloud|bis\.gov\.in|manakonline/i.test(blob)) {
      return;
    }
    try {
      chrome.downloads.cancel(item.id, () => {
        void chrome.runtime.lastError;
        chrome.downloads.erase({ id: item.id }, () => {
          void chrome.runtime.lastError;
        });
      });
    } catch {
      /* ignore */
    }
  });
  chrome.downloads.onChanged.addListener((delta) => {
    if (!delta.state || delta.state.current !== "complete") return;
    chrome.downloads.search({ id: delta.id }, async (items) => {
      const item = items && items[0];
      if (!item) return;
      const blob = `${item.url} ${item.finalUrl || ""} ${item.referrer || ""} ${item.filename || ""} ${item.mime || ""}`;
      if (pendingDownloadCapture && /pdf/i.test(blob)) {
        const wantedTab = pendingDownloadCapture.tabId;
        const sameTab = !wantedTab || item.tabId === wantedTab || /bsbedge|bis\.gov/i.test(blob);
        if (sameTab) {
          try {
            const res = await fetch(item.finalUrl || item.url, { credentials: "include" });
            const buf = await res.arrayBuffer();
            if (buf.byteLength >= 80) {
              const reply = pendingDownloadCapture.sendResponse;
              const wantedName =
                pendingDownloadCapture.wantedName ||
                (item.filename || "document.pdf").split(/[/\\]/).pop();
              clearTimeout(pendingDownloadCapture.timer);
              pendingDownloadCapture = null;
              reply({
                ok: true,
                name: wantedName,
                mime: item.mime || "application/pdf",
                base64: arrayBufferToBase64(buf),
              });
              try {
                await chrome.downloads.removeFile(item.id);
              } catch {
                /* ignore */
              }
              try {
                await chrome.downloads.erase({ id: item.id });
              } catch {
                /* ignore */
              }
              return;
            }
          } catch {
            /* fall through to Manak watcher */
          }
        }
      }
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
