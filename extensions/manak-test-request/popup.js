const KIND = "QE_MANAK_TR_V1";
const statusEl = document.getElementById("status");
const powerBtn = document.getElementById("power");

function setStatus(message) {
  statusEl.textContent = message;
}

function paintPower(on) {
  document.body.classList.toggle("off", !on);
  powerBtn.classList.toggle("on", on);
  powerBtn.classList.toggle("off", !on);
  powerBtn.textContent = on ? "🟢" : "🔴";
  powerBtn.title = on ? "Extension ON" : "Extension OFF";
}

async function loadPower() {
  const data = await chrome.storage.local.get(["qeManakEnabled"]);
  paintPower(data.qeManakEnabled !== false);
}

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
  setStatus(next ? "ON — auto-fill will run." : "OFF — auto-fill paused.");
});

void loadPower();

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
    setStatus("No active tab.");
    return;
  }
  if (!isManak(tab.url)) {
    setStatus("Open a manakonline.in tab first.");
    return;
  }
  try {
    const result = await chrome.tabs.sendMessage(tab.id, message);
    setStatus((result && result.message) || "Done.");
  } catch (err) {
    setStatus(err instanceof Error ? err.message : "Reload the Manak tab, then try again.");
  }
}

document.getElementById("openTr").addEventListener("click", async () => {
  let payload = null;
  try {
    payload = parsePayload(await navigator.clipboard.readText());
  } catch {
    payload = null;
  }
  chrome.runtime.sendMessage({ type: "QE_MANAK_OPEN_TR", payload }, (res) => {
    setStatus((res && res.message) || "Opening Test Request…");
  });
});

document.getElementById("fill").addEventListener("click", async () => {
  try {
    const raw = await navigator.clipboard.readText();
    const payload = parsePayload(raw);
    if (!payload) {
      setStatus("Copy a sample from Consultancy Pro first.");
      return;
    }
    await sendToTab({ type: "QE_MANAK_FILL", payload });
  } catch {
    setStatus("Clipboard blocked. Copy the sample again.");
  }
});

document.getElementById("login").addEventListener("click", () => {
  chrome.runtime.sendMessage({ type: "QE_MANAK_OPEN_LOGIN" }, () => {
    setStatus("Opening eBIS login.");
  });
});
