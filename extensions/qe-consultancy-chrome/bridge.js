(function () {
  if (/manakonline\.in$/i.test(location.hostname)) return;

  function markPresent() {
    try {
      document.documentElement.dataset.qeConsultancy = "1";
      window.__QE_CONSULTANCY__ = true;
    } catch {
      /* ignore */
    }
  }
  markPresent();

  function runtimeOk() {
    try {
      return Boolean(typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.id);
    } catch {
      return false;
    }
  }

  function storageOk() {
    try {
      return Boolean(runtimeOk() && chrome.storage && chrome.storage.local);
    } catch {
      return false;
    }
  }

  function sendRuntime(message, onDone) {
    if (!runtimeOk()) {
      if (onDone) onDone();
      return;
    }
    try {
      const sent = chrome.runtime.sendMessage(message, () => {
        void chrome.runtime.lastError;
        if (onDone) onDone();
      });
      if (sent && typeof sent.catch === "function") {
        sent.catch(() => {
          if (onDone) onDone();
        });
      }
    } catch {
      if (onDone) onDone();
    }
  }

  let lastPublishedKey = "";

  function resultKey(result) {
    if (!result) return "";
    return [
      result.sampleId || "",
      result.sample_code || "",
      result.qr_code || "",
      result.pdfName || "",
      String((result.pdfBase64 || "").length),
      String(result.filledAt || ""),
    ].join("|");
  }

  function publish(result, force) {
    if (!result || (!result.sample_code && !result.pdfBase64)) return;
    const key = resultKey(result);
    if (!force && key && key === lastPublishedKey) return;
    lastPublishedKey = key;
    window.postMessage({ type: "QE_MANAK_RESULT", result }, "*");
    window.dispatchEvent(new CustomEvent("qe-manak-sample-result", { detail: result }));
  }

  function pullStoredResult(force) {
    if (!storageOk()) return;
    try {
      chrome.storage.local.get(["manakResult"], (data) => {
        void chrome.runtime.lastError;
        if (data && data.manakResult) publish(data.manakResult, force);
      });
    } catch {
      /* extension context invalidated after Reload */
    }
  }

  window.addEventListener("message", (event) => {
    if (event.source !== window) return;
    const data = event.data;
    if (!data || typeof data !== "object") return;
    if (data.type === "QE_MANAK_PULL_RESULT") {
      pullStoredResult(true);
      return;
    }
    if (data.type === "QE_IS_CODE_PING") {
      markPresent();
      window.postMessage({ type: "QE_IS_CODE_PONG" }, "*");
      sendRuntime({ type: "QE_IS_CODE_PING" });
      return;
    }
    if (data.type === "QE_IS_CODE_FETCH") {
      markPresent();
      window.postMessage({ type: "QE_IS_CODE_FETCH_ACK" }, "*");
      sendRuntime({ type: "QE_IS_CODE_FETCH", isNumber: data.isNumber || "" });
      return;
    }
    if (data.type !== "QE_MANAK_OPEN") return;
    if (window.__qeManakOpenSent && Date.now() - window.__qeManakOpenSent < 2000) {
      window.postMessage({ type: "QE_MANAK_OPEN_ACK" }, "*");
      return;
    }
    window.__qeManakOpenSent = Date.now();
    sendRuntime(
      {
        type: "QE_MANAK_OPEN_TR",
        payload: data.payload,
        loginOnly: Boolean(data.loginOnly),
        loginUrl: data.loginUrl || "",
        homeUrl: data.homeUrl || "",
        portalUserId: data.portalUserId || "",
        portalPassword: data.portalPassword || "",
      },
      () => {
        window.postMessage({ type: "QE_MANAK_OPEN_ACK" }, "*");
      },
    );
  });

  if (runtimeOk()) {
    sendRuntime({ type: "QE_IS_CODE_PING" });
    try {
      chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
        if (!msg || typeof msg !== "object") return;
        if ((msg.type === "QE_MANAK_RESULT" || msg.type === "QE_MANAK_PDF") && msg.result) {
          publish(msg.result, true);
        }
        if (msg.type === "QE_IS_CODE_PROGRESS") {
          window.postMessage({ type: "QE_IS_CODE_PROGRESS", message: msg.message || "" }, "*");
        }
        if (msg.type === "QE_IS_CODE_FILL") {
          window.postMessage({ type: "QE_IS_CODE_FILL", payload: msg.payload || {} }, "*");
        }
        if (msg.type === "QE_CAPTCHA_AI") {
          const requestId = msg.requestId || `cap-${Date.now()}`;
          const timer = window.setTimeout(() => {
            window.removeEventListener("message", onAiResult);
            sendResponse({ text: "" });
          }, 25000);
          function onAiResult(event) {
            if (event.source !== window) return;
            if (!event.data || event.data.type !== "QE_CAPTCHA_AI_RESULT") return;
            if (event.data.requestId && event.data.requestId !== requestId) return;
            window.clearTimeout(timer);
            window.removeEventListener("message", onAiResult);
            sendResponse({ text: String(event.data.text || "") });
          }
          window.addEventListener("message", onAiResult);
          window.postMessage({ type: "QE_CAPTCHA_AI", image: msg.image || "", requestId }, "*");
          return true;
        }
      });
    } catch {
      /* ignore */
    }
  }

  if (!storageOk()) return;

  try {
    chrome.storage.onChanged.addListener((changes, area) => {
      if (!storageOk()) return;
      if (area !== "local" || !changes.manakResult) return;
      publish(changes.manakResult.newValue, true);
    });
  } catch {
    /* extension context invalidated after Reload */
  }

  pullStoredResult(true);
  window.addEventListener("focus", () => pullStoredResult(true));
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") pullStoredResult(true);
  });
  [800, 2500, 6000].forEach((ms) => {
    window.setTimeout(() => pullStoredResult(true), ms);
  });
})();
