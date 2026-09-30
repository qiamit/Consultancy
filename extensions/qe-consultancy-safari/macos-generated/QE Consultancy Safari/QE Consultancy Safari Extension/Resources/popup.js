const statusEl = document.getElementById("status");
const powerToggle = document.getElementById("powerToggle");
const powerLabel = document.getElementById("powerLabel");
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
  if (powerToggle) powerToggle.checked = on;
  if (powerLabel) {
    powerLabel.textContent = on
      ? "ON — login → Test Request → save back to app"
      : "OFF — app opens Manak page only (no auto-fill)";
  }
}

async function loadPower() {
  const data = await chrome.storage.local.get(["qeManakEnabled"]);
  paintPower(data.qeManakEnabled !== false);
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

  powerToggle.addEventListener("change", async () => {
    const next = powerToggle.checked;
    await chrome.storage.local.set({
      qeManakEnabled: next,
      qeManakArmed: next,
    });
    if (!next) {
      await chrome.storage.local.remove(["pendingFill", "qeManakHomeReady", "qeManakPortal"]);
    }
    paintPower(next);
    setStatus(
      next
        ? "ON — use Manak / Login in Consultancy Pro to start the full flow."
        : "OFF — auto login / Test Request / save-back is paused.",
      false,
    );
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
