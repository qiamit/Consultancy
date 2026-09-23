(function () {
  if (/manakonline\.in$/i.test(location.hostname)) return;

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

  window.addEventListener("message", (event) => {
    if (event.source !== window) return;
    const data = event.data;
    if (!data || data.type !== "QE_MANAK_OPEN") return;
    sendRuntime(
      {
        type: "QE_MANAK_OPEN_TR",
        payload: data.payload,
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

  function publish(result) {
    if (!result || (!result.sample_code && !result.pdfBase64)) return;
    window.postMessage({ type: "QE_MANAK_RESULT", result }, "*");
    window.dispatchEvent(new CustomEvent("qe-manak-sample-result", { detail: result }));
  }

  if (!storageOk()) return;

  try {
    chrome.storage.onChanged.addListener((changes, area) => {
      if (!storageOk()) return;
      if (area !== "local" || !changes.manakResult) return;
      publish(changes.manakResult.newValue);
    });
    chrome.storage.local.get(["manakResult"], (data) => {
      void chrome.runtime.lastError;
      if (data && data.manakResult) publish(data.manakResult);
    });
  } catch {
    /* extension context invalidated after Reload */
  }
})();
