const KIND = "QE_MANAK_TR_V1";
const statusEl = document.getElementById("status");
const powerBtn = document.getElementById("power");
const enableBypass = document.getElementById("enableBypass");
const enableCtrlBypass = document.getElementById("enableCtrlBypass");
const fieldNameInput = document.getElementById("fieldName");
const fieldValueInput = document.getElementById("fieldValue");
const fillButton = document.getElementById("fillButton");

init();

function setStatus(message, isError) {
  statusEl.textContent = message || "";
  statusEl.classList.toggle("error", Boolean(isError && message));
}

function paintPower(on) {
  document.body.classList.toggle("off", !on);
  powerBtn.classList.toggle("on", on);
  powerBtn.classList.toggle("off", !on);
  powerBtn.textContent = on ? "ON" : "OFF";
  powerBtn.title = on ? "Extension ON" : "Extension OFF";
}

async function loadPower() {
  const data = await chrome.storage.local.get(["qeManakEnabled"]);
  paintPower(data.qeManakEnabled !== false);
}

function parsePayload(raw) {
  const source = String(raw || "").trim();
  const start = source.indexOf("{");
  const end = source.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    const parsed = JSON.parse(source.slice(start, end + 1));
    if (!parsed || parsed.kind !== KIND) return null;
    return parsed;
  } catch {
    return null;
  }
}

async function activeTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

function isManak(url) {
  try {
    const host = new URL(url || "").hostname;
    return host === "manakonline.in" || host.endsWith(".manakonline.in");
  } catch {
    return false;
  }
}

async function sendToTab(message) {
  const tab = await activeTab();
  if (!tab || !tab.id) {
    setStatus("No active tab.", true);
    return;
  }
  if (!isManak(tab.url)) {
    setStatus("Open a manakonline.in tab first.", true);
    return;
  }
  try {
    const result = await chrome.tabs.sendMessage(tab.id, message);
    setStatus((result && result.message) || "Done.", false);
  } catch (err) {
    setStatus(err instanceof Error ? err.message : "Reload the Manak tab, then try again.", true);
  }
}

function init() {
  void loadPower();

  chrome.runtime.sendMessage({ type: "GET_BYPASS_STATE" }, (response) => {
    if (chrome.runtime.lastError) {
      setStatus("Failed to load extension state.", true);
      return;
    }
    enableBypass.checked = response?.enabled !== false;
    enableCtrlBypass.checked = response?.ctrlKeyEnabled !== false;
  });

  powerBtn.addEventListener("click", async () => {
    const data = await chrome.storage.local.get(["qeManakEnabled"]);
    const next = data.qeManakEnabled === false;
    await chrome.storage.local.set({
      qeManakEnabled: next,
      qeManakArmed: next,
    });
    if (!next) {
      await chrome.storage.local.remove(["pendingFill", "qeManakHomeReady", "qeManakPortal"]);
    }
    paintPower(next);
    setStatus(next ? "ON — auto-fill will run." : "OFF — auto-fill paused.", false);
  });

  enableBypass.addEventListener("change", () => {
    const enabled = enableBypass.checked;
    chrome.runtime.sendMessage({ type: "SET_BYPASS_STATE", enabled }, (response) => {
      if (chrome.runtime.lastError) {
        setStatus(`Failed to update: ${chrome.runtime.lastError.message}`, true);
        return;
      }
      if (response?.ok === false) {
        setStatus(`Failed to update: ${response.error}`, true);
        return;
      }
      setStatus(enabled ? "Copy / paste bypass enabled." : "Copy / paste bypass disabled.", false);
    });
  });

  enableCtrlBypass.addEventListener("change", () => {
    const enabled = enableCtrlBypass.checked;
    chrome.runtime.sendMessage({ type: "SET_CTRL_BYPASS_STATE", enabled }, (response) => {
      if (chrome.runtime.lastError) {
        setStatus(`Failed to update shortcuts: ${chrome.runtime.lastError.message}`, true);
        return;
      }
      if (response?.ok === false) {
        setStatus(`Failed to update: ${response.error}`, true);
        return;
      }
      setStatus(enabled ? "Shortcut bypass enabled." : "Shortcut bypass disabled.", false);
    });
  });

  document.getElementById("openTr").addEventListener("click", async () => {
    let payload = null;
    try {
      payload = parsePayload(await navigator.clipboard.readText());
    } catch {
      payload = null;
    }
    chrome.runtime.sendMessage({ type: "QE_MANAK_OPEN_TR", payload }, (res) => {
      setStatus((res && res.message) || "Opening Test Request…", false);
    });
  });

  document.getElementById("fill").addEventListener("click", async () => {
    try {
      const raw = await navigator.clipboard.readText();
      const payload = parsePayload(raw);
      if (!payload) {
        setStatus("Copy a sample from Consultancy Pro first.", true);
        return;
      }
      await sendToTab({ type: "QE_MANAK_FILL", payload });
    } catch {
      setStatus("Clipboard blocked. Copy the sample again.", true);
    }
  });

  document.getElementById("login").addEventListener("click", () => {
    chrome.runtime.sendMessage({ type: "QE_MANAK_OPEN_LOGIN" }, () => {
      setStatus("Opening eBIS login.", false);
    });
  });

  const bsbEmail = document.getElementById("bsbEmail");
  const bsbPassword = document.getElementById("bsbPassword");
  const saveBsb = document.getElementById("saveBsb");
  if (bsbEmail && bsbPassword && saveBsb) {
    chrome.storage.local.get(["qeBsbedgeEmail", "qeBsbedgePassword"], (data) => {
      bsbEmail.value = data.qeBsbedgeEmail || "";
      bsbPassword.value = data.qeBsbedgePassword || "";
    });
    saveBsb.addEventListener("click", async () => {
      await chrome.storage.local.set({
        qeBsbedgeEmail: bsbEmail.value.trim(),
        qeBsbedgePassword: bsbPassword.value,
      });
      setStatus("BSB Edge login saved in this browser only.", false);
    });
  }

  fillButton.addEventListener("click", () => {
    const fieldName = fieldNameInput.value.trim();
    const value = fieldValueInput.value;
    if (!fieldName) {
      setStatus("Enter a field name.", true);
      return;
    }
    chrome.runtime.sendMessage({ type: "RUN_BULK_FILL", fieldName, value }, (response) => {
      if (chrome.runtime.lastError) {
        setStatus(chrome.runtime.lastError.message, true);
        return;
      }
      if (!response || response.ok === false) {
        setStatus(response?.error || "Failed to fill fields.", true);
        return;
      }
      setStatus(`Updated ${response.updatedCount} field(s).`, false);
    });
  });
}
