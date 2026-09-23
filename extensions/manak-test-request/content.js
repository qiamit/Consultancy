(function () {
  window.addEventListener("unhandledrejection", (event) => {
    const msg = String((event.reason && event.reason.message) || event.reason || "");
    if (/not focused|clipboard|could not establish connection|receiving end|navigation rejected/i.test(msg)) {
      event.preventDefault();
    }
  });

  const KIND = "QE_MANAK_TR_V1";
  const RESULT_KIND = "QE_MANAK_TR_RESULT_V1";
  const TR_URL =
    "https://www.manakonline.in/MANAK/testRequestGenerationForApplicant";
  const HOME_URL = "https://www.manakonline.in/MANAK/login";
  const map = typeof QE_MANAK_FIELD_MAP === "object" ? QE_MANAK_FIELD_MAP : { fields: [] };

  function text(value) {
    return String(value ?? "").trim();
  }

  function normalize(value) {
    return text(value).toLowerCase().replace(/\s+/g, " ");
  }

  function sleep(ms) {
    return new Promise((resolve) => window.setTimeout(resolve, ms));
  }

  function lookup(payload, key) {
    const parts = String(key).split(".");
    let cur = payload;
    for (const part of parts) {
      if (!cur || typeof cur !== "object") return "";
      cur = cur[part];
    }
    return text(cur);
  }

  function parsePayload(raw) {
    const source = text(raw);
    const start = source.indexOf("{");
    const end = source.lastIndexOf("}");
    if (start < 0 || end <= start) return null;
    try {
      const parsed = JSON.parse(source.slice(start, end + 1));
      if (!parsed || parsed.kind !== KIND) return null;
      if (!parsed.application || !parsed.sample) return null;
      return parsed;
    } catch {
      return null;
    }
  }

  function isSkipField(el) {
    const blob = [
      el.id,
      el.name,
      el.placeholder,
      el.getAttribute("aria-label"),
      el.getAttribute("autocomplete"),
    ]
      .map(normalize)
      .join(" ");
    return (map.skipField || []).some((re) => re.test(blob));
  }

  function isBlockedUrl(url) {
    const href = text(url);
    if (!href) return false;
    return (map.neverOpen || []).some((re) => re.test(href));
  }

  function isNeverClick(el) {
    const blob = [
      el.textContent,
      el.value,
      el.getAttribute("aria-label"),
      el.getAttribute("title"),
      el.getAttribute("onclick"),
      el.getAttribute("href"),
      el.getAttribute("src"),
      el.id,
      el.className,
    ]
      .map(normalize)
      .join(" ");
    if ((map.neverClick || []).some((re) => re.test(blob))) return true;
    if (/captcha|kaptcha/.test(blob) && /refresh|reload|new|change/.test(blob)) return true;
    if (el.tagName === "IMG" && /captcha|kaptcha/.test(blob)) return true;
    return isBlockedUrl(el.href || el.getAttribute("href") || "");
  }

  function writeInput(el, value) {
    const proto =
      el.tagName === "TEXTAREA" ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    const desc = Object.getOwnPropertyDescriptor(proto, "value");
    if (desc && desc.set) desc.set.call(el, value);
    else el.value = value;
  }

  const MONTHS_SHORT = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

  function parseDateParts(value) {
    const raw = text(value);
    if (!raw) return null;
    const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    const dmyNum = raw.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})$/);
    const dmyMon = raw.match(/^(\d{1,2})[\/\-.]([A-Za-z]{3})[\/\-.](\d{4})$/);
    let year = 0;
    let month = 0;
    let day = 0;
    if (iso) {
      year = Number(iso[1]);
      month = Number(iso[2]);
      day = Number(iso[3]);
    } else if (dmyMon) {
      year = Number(dmyMon[3]);
      day = Number(dmyMon[1]);
      const idx = MONTHS_SHORT.findIndex((m) => m.toLowerCase() === dmyMon[2].toLowerCase());
      month = idx + 1;
    } else if (dmyNum) {
      day = Number(dmyNum[1]);
      month = Number(dmyNum[2]);
      year = Number(dmyNum[3]);
    }
    if (!year || !month || !day) return null;
    return { day, month, year };
  }

  function dateFormats(value) {
    const parts = parseDateParts(value);
    const raw = text(value);
    if (!parts) return raw ? [raw] : [];
    const day = String(parts.day).padStart(2, "0");
    const month = String(parts.month).padStart(2, "0");
    const mon = MONTHS_SHORT[parts.month - 1] || "";
    const year = String(parts.year);
    return [
      `${day}-${month}-${year}`,
      `${day}/${month}/${year}`,
      `${day}-${mon}-${year}`,
      `${day}/${mon}/${year}`,
      `${year}-${month}-${day}`,
      raw,
    ].filter(Boolean);
  }

  function visibleCalendar() {
    return Array.from(
      document.querySelectorAll(
        ".ui-datepicker, .datepicker-dropdown, .datepicker, .bootstrap-datetimepicker-widget",
      ),
    ).find((el) => el.offsetParent !== null && !/display:\s*none/i.test(el.getAttribute("style") || ""));
  }

  function parseCalendarTitle(title) {
    const raw = normalize(title);
    const year = Number((raw.match(/\b(19|20)\d{2}\b/) || [])[0] || 0);
    const monthIdx = MONTHS_SHORT.findIndex((m) => raw.includes(m.toLowerCase()));
    const long = [
      "january","february","march","april","may","june",
      "july","august","september","october","november","december",
    ].findIndex((m) => raw.includes(m));
    const month = (monthIdx >= 0 ? monthIdx : long) + 1;
    return { month, year };
  }

  async function pickDateFromCalendar(el, parts) {
    if (!el || !parts) return false;
    el.focus();
    el.click();
    const wrap = el.closest(".input-group, .form-group, td, div") || el.parentElement;
    const trigger = wrap
      ? wrap.querySelector(
          ".ui-datepicker-trigger, .glyphicon-calendar, .fa-calendar, .input-group-addon, [class*='calendar' i]",
        )
      : null;
    if (trigger) trigger.click();
    await sleep(250);
    let cal = visibleCalendar();
    if (!cal) {
      el.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
      el.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));
      await sleep(250);
      cal = visibleCalendar();
    }
    if (!cal) return false;

    for (let i = 0; i < 30; i += 1) {
      const title = cal.querySelector(".ui-datepicker-title, .datepicker-switch, .picker-switch");
      const shown = parseCalendarTitle(title ? title.textContent : "");
      if (shown.year === parts.year && shown.month === parts.month) break;
      const ahead = shown.year * 12 + shown.month > parts.year * 12 + parts.month;
      const btn = cal.querySelector(
        ahead
          ? ".ui-datepicker-prev, .prev, [data-action='previous']"
          : ".ui-datepicker-next, .next, [data-action='next']",
      );
      if (!btn) break;
      btn.click();
      await sleep(70);
    }

    const dayCell = Array.from(cal.querySelectorAll("td a, td.day, .day")).find((node) => {
      const cls = `${node.className} ${(node.parentElement && node.parentElement.className) || ""}`;
      if (/old|new|disabled|off|other-month/i.test(cls)) return false;
      return Number(text(node.textContent)) === parts.day;
    });
    if (!dayCell) return false;
    dayCell.click();
    await sleep(120);
    return Boolean(text(el.value));
  }

  async function fillDateField(el, value) {
    const parts = parseDateParts(value);
    const formats = dateFormats(value);
    if (parts) {
      el.dispatchEvent(
        new CustomEvent("qe-manak-fill-date", {
          bubbles: true,
          detail: { formats, day: parts.day, month: parts.month, year: parts.year },
        }),
      );
    }
    for (const fmt of formats) {
      setNativeValue(el, fmt);
      if (text(el.value)) break;
    }
    if (text(el.value) && parts && parseDateParts(el.value) && parseDateParts(el.value).day === parts.day) {
      return true;
    }
    return pickDateFromCalendar(el, parts);
  }

  function setNativeValue(el, value) {
    if (el.tagName === "SELECT") {
      const wanted = normalize(value);
      const options = Array.from(el.options || []);
      const match = options.find((opt) => {
        const label = normalize(opt.textContent);
        const val = normalize(opt.value);
        if (/no lab selected|select lab|choose lab/.test(label)) return false;
        return label === wanted || val === wanted || label.includes(wanted) || wanted.includes(label);
      });
      if (match) el.value = match.value;
      else el.value = value;
    } else if (el.type === "date") {
      const iso = dateFormats(value).find((item) => /^\d{4}-\d{2}-\d{2}$/.test(item));
      writeInput(el, iso || value);
    } else {
      writeInput(el, value);
    }
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
    el.dispatchEvent(new Event("blur", { bubbles: true }));
    try {
      el.dispatchEvent(new KeyboardEvent("keyup", { bubbles: true }));
    } catch {
      /* ignore */
    }
  }

  function fillControl(el, key, value) {
    if (key === "sample.date_of_manufacturing" || key === "sample.payment_date") {
      void fillDateField(el, value);
      return;
    }
    setNativeValue(el, value);
  }

  function labelForControl(el) {
    if (el.id) {
      const byFor = document.querySelector(`label[for="${CSS.escape(el.id)}"]`);
      if (byFor) return normalize(byFor.textContent);
    }
    const wrap = el.closest("label, tr, td, th, .form-group, .form-row, li, div");
    if (wrap) {
      const label = wrap.querySelector("label, th, .control-label, .form-label");
      if (label) return normalize(label.textContent);
      return normalize(wrap.textContent).slice(0, 80);
    }
    return normalize(el.getAttribute("aria-label") || el.placeholder || "");
  }

  function isGhostControl(el) {
    const cls = String(el.className || "");
    const id = String(el.id || "");
    return (
      /select2-input|select2-focusser|select2-offscreen/i.test(cls) ||
      /^s2id_autogen/i.test(id) ||
      /^(probDesc|problemType|file|selectAllOng)$/i.test(id)
    );
  }

  function findBySelectors(selectors) {
    for (const sel of selectors || []) {
      try {
        const el = document.querySelector(sel);
        if (el && !isSkipField(el) && !isGhostControl(el)) return el;
      } catch {
        /* ignore invalid selector */
      }
    }
    return null;
  }

  function findByLabels(labels) {
    const wanted = (labels || []).map(normalize).filter(Boolean);
    if (!wanted.length) return null;
    const controls = Array.from(
      document.querySelectorAll("input, textarea, select"),
    ).filter((el) => {
      const type = String(el.type || "").toLowerCase();
      if (["hidden", "submit", "button", "image", "file", "password"].includes(type)) return false;
      if (isGhostControl(el) || isSkipField(el)) return false;
      if (el.readOnly && !/datepicker/i.test(String(el.className || ""))) return false;
      return true;
    });
    let best = null;
    let bestScore = 0;
    for (const el of controls) {
      const lab = labelForControl(el);
      let score = 0;
      for (const w of wanted) {
        if (lab === w) score = Math.max(score, 3);
        else if (lab.startsWith(w) || w.startsWith(lab)) score = Math.max(score, 2);
      }
      if (score > bestScore) {
        bestScore = score;
        best = el;
      }
    }
    return bestScore >= 2 ? best : null;
  }

  function clickableCandidates() {
    return Array.from(
      document.querySelectorAll("a, button, [role='button'], input[type='button'], td, span, div"),
    ).filter((el) => {
      if (!el || isNeverClick(el)) return false;
      const t = normalize(el.textContent || el.value || "");
      return t.length > 0 && t.length < 80;
    });
  }

  function clickByLabels(labels) {
    const wanted = (labels || []).map(normalize);
    const nodes = clickableCandidates();
    const match = nodes.find((el) => {
      const t = normalize(el.textContent || el.value || "");
      return wanted.some((w) => t === w || t.includes(w));
    });
    if (!match) return false;
    match.click();
    return true;
  }

  function clickSearch() {
    const nav = map.navigation && map.navigation.searchIs;
    const el = findBySelectors((nav && nav.selectors) || []);
    if (el && !isNeverClick(el)) {
      el.click();
      return true;
    }
    return clickByLabels((nav && nav.labels) || ["search"]);
  }

  function isDigits(value) {
    const nums = normalize(value).replace(/^is\s*/, "").match(/\d{3,7}/g) || [];
    const notYear = nums.filter((n) => !/^(19|20)\d{2}$/.test(n));
    return (notYear.sort((a, b) => b.length - a.length)[0] || nums[0] || "");
  }

  function textHasIsNumber(blob, digits) {
    if (!digits) return false;
    return new RegExp(`(?:^|[^0-9])${digits}(?:[^0-9]|$)`).test(blob);
  }

  function isListItems() {
    const nav = map.navigation && map.navigation.selectIs;
    const fromMap = Array.from(
      document.querySelectorAll((nav && nav.selectors ? nav.selectors.join(", ") : "") || "#mylist li"),
    );
    const extra = Array.from(
      document.querySelectorAll("#mylist li.searchList, #results li.searchList, #standardResultsSet li, li.searchList"),
    );
    return [...new Set(fromMap.concat(extra))];
  }

  function selectIsResult(isNumber) {
    const digits = isDigits(isNumber);
    const year = (normalize(isNumber).match(/\b(19|20)\d{2}\b/) || [])[0] || "";
    if (!digits) return false;

    document.documentElement.setAttribute("data-qe-is-digits", digits);
    document.documentElement.setAttribute("data-qe-is-year", year);
    document.dispatchEvent(
      new CustomEvent("qe-manak-pick-is", {
        bubbles: true,
        detail: { digits, year },
      }),
    );

    const items = isListItems();
    const match =
      items.find((node) => {
        const blob = normalize((node.id || "") + " " + (node.textContent || ""));
        return textHasIsNumber(blob, digits) && (!year || blob.includes(year));
      }) ||
      items.find((node) => textHasIsNumber(normalize((node.id || "") + " " + (node.textContent || "")), digits));
    if (match && !isNeverClick(match)) {
      match.click();
      return true;
    }

    const scopes = Array.from(
      document.querySelectorAll(
        "#results, #mylist, #standardResultsSet, table, .modal, .ui-dialog, [class*='search' i], [class*='dropdown-content' i]",
      ),
    );
    for (const scope of scopes) {
      if (!textHasIsNumber(normalize(scope.textContent), digits)) continue;
      const rows = Array.from(scope.querySelectorAll("tr, li")).filter((node) =>
        textHasIsNumber(normalize((node.id || "") + " " + (node.textContent || "")), digits),
      );
      const row =
        (year && rows.find((node) => normalize(node.textContent).includes(year))) || rows[0];
      if (row) {
        const pick = row.querySelector(
          "input[type='radio'], input[type='checkbox'], button, input[type='button']",
        );
        if (pick && !isNeverClick(pick)) pick.click();
        else if (!isNeverClick(row)) row.click();
        return true;
      }
    }
    return false;
  }

  function pageShowsSelectedIs(isNumber) {
    const digits = isDigits(isNumber);
    if (!digits) return false;
    const standard = document.getElementById("StandardNumber");
    if (standard && isDigits(standard.value) === digits) return true;
    const field =
      findBySelectors((map.fields || []).find((item) => item.key === "application.isSearch")?.selectors || []) ||
      document.getElementById("org");
    const raw = field ? text(field.value) : "";
    return Boolean(digits && /\[\d{4}\]/.test(raw) && isDigits(raw) === digits);
  }

  function showBanner(message, ok, sticky) {
    let box = document.getElementById("qe-manak-tr-banner");
    if (!box) {
      box = document.createElement("div");
      box.id = "qe-manak-tr-banner";
      box.style.cssText =
        "position:fixed;z-index:2147483647;top:12px;right:12px;max-width:360px;padding:10px 12px;border-radius:10px;font:12px/1.4 Segoe UI,sans-serif;box-shadow:0 8px 24px rgba(0,0,0,.25)";
      document.documentElement.appendChild(box);
    }
    box.style.background = ok ? "#065f46" : "#7f1d1d";
    box.style.color = "#fff";
    box.textContent = message;
    if (box._qeHide) window.clearTimeout(box._qeHide);
    if (!sticky) {
      box._qeHide = window.setTimeout(() => {
        if (box.parentNode) box.remove();
      }, 8000);
    }
  }

  function fillPayload(payload, keys) {
    if (!payload) {
      return { ok: false, filled: 0, message: "No QE_MANAK_TR_V1 payload." };
    }
    if (!/testRequestGenerationForApplicant/i.test(location.pathname)) {
      return { ok: false, filled: 0, message: "Not on Generate Test Request page." };
    }

    const allow = keys ? new Set(keys) : null;
    const used = new Set();
    let filled = 0;
    const missing = [];
    for (const field of map.fields || []) {
      if (allow && !allow.has(field.key)) continue;
      const value = lookup(payload, field.key);
      if (!value) continue;
      const el = findBySelectors(field.selectors) || findByLabels(field.labels);
      if (!el || used.has(el)) {
        missing.push(field.key);
        continue;
      }
      if (el.readOnly && !/datepicker/i.test(String(el.className || ""))) continue;
      used.add(el);
      fillControl(el, field.key, value);
      if (el.tagName === "SELECT") {
        el.dispatchEvent(
          new CustomEvent("qe-manak-set-select", {
            bubbles: true,
            detail: { value },
          }),
        );
      }
      filled += 1;
    }

    const message =
      filled > 0
        ? `Filled ${filled} field(s). Captcha / Submit stay manual.`
        : "No matching Test Request fields on this page yet.";
    return { ok: filled > 0, filled, missing, message };
  }

  function softLabKey(value) {
    return normalize(value)
      .replace(/\b(pvt\.?|private|ltd\.?|limited|llp|llc|inc|lab|laboratory|testing|solutions|and|&|co|c\/o)\b/g, " ")
      .replace(/[^a-z0-9]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function labTokens(value) {
    return softLabKey(value).split(" ").filter((t) => t.length >= 4);
  }

  function labMatchScore(blob, wanted) {
    const a = softLabKey(blob);
    const b = softLabKey(wanted);
    if (!b) return 0;
    if (a === b) return 100;
    if (a.includes(b) || b.includes(a)) return 80;
    const tokens = labTokens(wanted);
    if (!tokens.length) return 0;
    const hits = tokens.filter((t) => a.includes(t)).length;
    return Math.round((hits / tokens.length) * 70);
  }

  function labFilterQuery(labName) {
    return labTokens(labName).slice(0, 2).join(" ");
  }

  function findMatchingLabRadio(labName) {
    const wanted = text(labName);
    const radios = Array.from(document.querySelectorAll("input[name='clickonlab']"));
    let best = null;
    let bestScore = 0;
    radios.forEach((el) => {
      const row = el.closest("tr");
      const nameCell = row && row.querySelector("[id='labnameval'], td:nth-child(3)");
      const blob = [(nameCell && nameCell.textContent) || "", (row && row.textContent) || "", el.value || ""].join(" ");
      if (/no lab selected|suggested lab/.test(normalize(blob))) return;
      let score = labMatchScore(blob, wanted);
      if (/osl/i.test(String(el.value || "")) && score > 0) score += 5;
      if (score > bestScore) {
        bestScore = score;
        best = el;
      }
    });
    if (wanted) return bestScore >= 40 ? best : null;
    return radios.find((el) => /osl/i.test(String(el.value || ""))) || radios[0] || null;
  }

  function applyLabFilter(labName) {
    const query = labFilterQuery(labName) || normalize(labName).slice(0, 12);
    document.documentElement.setAttribute("data-qe-lab-name", text(labName));
    document.documentElement.setAttribute("data-qe-lab-filter", query);
    document.dispatchEvent(new Event("qe-manak-filter-lab", { bubbles: true }));
    return query;
  }

  function requestLabPick(labName) {
    const token = `${text(labName)}:${Date.now()}`;
    document.documentElement.setAttribute("data-qe-lab-name", text(labName));
    document.documentElement.setAttribute("data-qe-lab-filter", labFilterQuery(labName) || normalize(labName).slice(0, 12));
    document.documentElement.setAttribute("data-qe-lab-pick", token);
    document.dispatchEvent(new Event("qe-manak-pick-lab", { bubbles: true }));
    const confirm = document.getElementById("selectFinalLab");
    if (confirm && !isNeverClick(confirm) && document.querySelector("input[name='clickonlab']:checked")) {
      confirm.click();
    }
  }

  function clickSuggestedLab(labName) {
    applyLabFilter(labName);
    const match = findMatchingLabRadio(labName);
    if (!match) return false;
    requestLabPick(labName);
    return true;
  }

  function labIsSelected(labName) {
    const el = document.getElementById("lab_name");
    if (!el || el.tagName !== "SELECT") return false;
    const opted = el.options[el.selectedIndex];
    const label = (opted && opted.textContent) || "";
    const val = text(el.value);
    if (!val || val === "0" || /select lab name|no lab selected/.test(normalize(label))) return false;
    if (!text(labName)) return true;
    return labMatchScore(label + " " + val, labName) >= 40;
  }

  async function pickLaboratory(payload) {
    const labName = lookup(payload, "sample.laboratory_name") || lookup(payload, "sample.destination_lab");
    if (labIsSelected(labName)) return true;

    const sug = findBySelectors((map.navigation && map.navigation.suggestedLab && map.navigation.suggestedLab.selectors) || []);
    if (sug) sug.click();

    const check =
      findBySelectors((map.navigation && map.navigation.checkLab && map.navigation.checkLab.selectors) || []) ||
      Array.from(document.querySelectorAll("button, input[type='button']")).find((el) =>
        /check lab availability/i.test(el.textContent || el.value || ""),
      );
    if (check && !isNeverClick(check)) check.click();

    let picked = false;
    for (let i = 0; i < 24 && !labIsSelected(labName); i += 1) {
      await sleep(700);
      const tableReady = Boolean(
        document.getElementById("filter") && document.querySelector("input[name='clickonlab']"),
      );
      if (tableReady) {
        applyLabFilter(labName);
        await sleep(450);
        picked = clickSuggestedLab(labName) || picked;
        if (picked) {
          for (let w = 0; w < 12 && !labIsSelected(labName); w += 1) await sleep(400);
          break;
        }
      } else if (i === 3 || i === 8) {
        const again = document.getElementById("suglab");
        if (again) again.click();
      }
    }
    if (!labIsSelected(labName) && labName) {
      showBanner(`Could not match laboratory “${labName}” in Check Lab Availability.`, false, true);
    }
    return labIsSelected(labName);
  }

  function isVisibleEl(el) {
    if (!el) return false;
    const st = window.getComputedStyle(el);
    if (st.display === "none" || st.visibility === "hidden" || Number(st.opacity) === 0) {
      return false;
    }
    const box = el.getBoundingClientRect();
    return box.width > 2 && box.height > 2;
  }

  function hasLogoutLink() {
    return Boolean(document.querySelector("a[href*='logout' i]"));
  }

  function isLoggedInSession() {
    return Boolean(loggedInPortalUser() || hasLogoutLink());
  }

  function isLoginPage() {
    if (isLoggedInSession()) return false;
    if (/ebislogin/i.test(location.pathname)) return true;
    const pass = document.querySelector("#InputPassword, input[name='passwd'], input[type='password']");
    return Boolean(pass && isVisibleEl(pass));
  }

  function isHomePage() {
    if (isTrPage() || isTestRequestListPage() || isViewOrPrintPage()) return false;
    if (/ebislogin/i.test(location.pathname)) return false;
    if (isLoginPage()) return false;
    if (isLoggedInSession()) return true;
    return /\/manak\/login\/?$/.test(location.pathname.toLowerCase());
  }

  function loggedInPortalUser() {
    const labels = Array.from(document.querySelectorAll(".profile-username")).map((el) =>
      text(el.textContent),
    );
    for (const line of labels) {
      const match = line.match(/user\s*name\s*:\s*([A-Za-z0-9._-]+)/i);
      if (match) return match[1];
    }
    const body = document.body ? document.body.innerText || "" : "";
    const match = body.match(/UserName:\s*([A-Za-z0-9._-]+)/i);
    return match ? match[1] : "";
  }

  function fillLoginFields(userId, password) {
    if (pageHasCaptcha()) return;
    if (/[?&]userId=/i.test(location.search)) return;
    const user = document.querySelector("#InputEmail, input[name='userId'], input[name='username']");
    const pass = document.querySelector("#InputPassword, input[type='password']");
    if (user && text(userId) && !text(user.value)) writeInput(user, text(userId));
    if (pass && text(password) && !text(pass.value)) writeInput(pass, text(password));
  }

  function readArmedState() {
    return new Promise((resolve) => {
      chrome.storage.local.get(
        ["qeManakArmed", "qeManakHomeReady", "qeManakPortal", "qeManakEnabled"],
        (data) => resolve(data || {}),
      );
    });
  }

  function hasIndianStandardField() {
    return Boolean(
      document.querySelector("#isNumber, #isNo, #is_number, input[name='isNumber'], input[name='isNo']") ||
        findByLabels(["indian standard", "is number", "iss"]),
    );
  }

  function isTrPage() {
    return /testRequestGenerationForApplicant/i.test(location.pathname);
  }

  function fillSessionKey(payload) {
    return `qeManakFilled:${text(payload.sampleId)}:${payload.copiedAt || ""}`;
  }

  function markQrSubmitted() {
    sessionStorage.setItem("qeManakQrSubmitted", "1");
    sessionStorage.setItem("qeManakNeedList", "1");
  }

  function watchQrSubmitClicks() {
    if (window.__qeManakQrSubmitWatch) return;
    window.__qeManakQrSubmitWatch = true;
    document.addEventListener(
      "click",
      (event) => {
        const el =
          event.target && event.target.closest
            ? event.target.closest("a, button, input, [role='button']")
            : null;
        if (!el || isNeverClick(el)) return;
        const t = normalize(el.textContent || el.value || el.title || el.getAttribute("aria-label") || "");
        if (!(t === "submit" || t === "save" || t.includes("submit qr") || t.includes("submit code"))) {
          return;
        }
        const wrap = el.closest("form, .panel, .box, table, tr, div") || document.body;
        if (wrap && wrap.querySelector("#qrcodeNumber, input[name='qrcodeNumber'], input[id*='qr' i]")) {
          markQrSubmitted();
        }
      },
      true,
    );
  }

  function fillQrIfPresent(payload) {
    const qr = lookup(payload, "sample.qr_code");
    if (!qr) return false;
    const field = (map.fields || []).find((item) => item.key === "sample.qr_code");
    const el = findBySelectors((field && field.selectors) || []) || findByLabels((field && field.labels) || []);
    if (!el) return false;
    if (text(el.value) === qr) {
      sessionStorage.setItem("qeManakQrFilled", "1");
      return false;
    }
    setNativeValue(el, qr);
    sessionStorage.setItem("qeManakQrFilled", "1");
    showBanner("QR Code filled.", true);
    return true;
  }

  function isPayLike(el) {
    const blob = normalize(el.textContent || el.value || el.getAttribute("aria-label") || "");
    return /pay\b|proceed to payment|otp/.test(blob);
  }

  function captchaInputs() {
    const named = Array.from(document.querySelectorAll("input, textarea")).filter((el) => {
      const type = String(el.type || "text").toLowerCase();
      if (["hidden", "password", "submit", "button", "checkbox", "radio", "file"].includes(type)) {
        return false;
      }
      const blob = [el.id, el.name, el.placeholder, el.getAttribute("aria-label"), el.className]
        .map(normalize)
        .join(" ");
      return /captcha|kaptcha|sec(?:urity)?\s*code|verif/.test(blob);
    });
    if (named.length) return named;
    const imgs = Array.from(
      document.querySelectorAll("img[src*='captcha' i], img[id*='captcha' i], img[alt*='captcha' i]"),
    );
    const nearby = [];
    imgs.forEach((img) => {
      const wrap = img.closest("tr, td, li, .form-group, .form-row, div") || img.parentElement;
      if (!wrap) return;
      wrap.querySelectorAll("input[type='text'], input:not([type])").forEach((el) => nearby.push(el));
    });
    return nearby;
  }

  function pageHasCaptcha() {
    if (captchaInputs().length > 0) return true;
    if (document.querySelector("img[src*='captcha' i], img[id*='captcha' i], img[alt*='captcha' i]")) {
      return true;
    }
    return /enter captcha|type the captcha|security code/i.test(document.body.innerText || "");
  }

  function userFilledCaptcha() {
    return captchaInputs().some((el) => text(el.value).length >= 4);
  }

  function clickWhitelist(labels) {
    const wanted = (labels || []).map(normalize).filter(Boolean);
    const nodes = Array.from(
      document.querySelectorAll("a, button, [role='button'], input[type='button'], input[type='submit']"),
    ).filter((el) => !isPayLike(el) && !isNeverClick(el));
    const score = (el) => {
      const t = normalize(el.textContent || el.value || el.getAttribute("aria-label") || "");
      if (wanted.some((w) => t === w)) return 2;
      if (wanted.some((w) => t.startsWith(w))) return 1;
      return 0;
    };
    const match = nodes
      .map((el) => ({ el, n: score(el) }))
      .filter((item) => item.n > 0)
      .sort((a, b) => b.n - a.n)[0];
    if (!match) return false;
    match.el.click();
    return true;
  }

  function afterCaptchaMap() {
    return map.afterCaptcha || {};
  }

  function clickContinueAfterCaptcha() {
    if (isLoginPage()) {
      return clickWhitelist(afterCaptchaMap().loginLabels || ["sign in", "login"]);
    }
    const generated = clickWhitelist(
      afterCaptchaMap().generateLabels || ["generate test request", "submit"],
    );
    if (generated) return true;
    return clickWhitelist(afterCaptchaMap().confirmLabels || ["confirm"]);
  }

  function clickDownloadTestRequest() {
    return clickWhitelist(
      afterCaptchaMap().downloadLabels || ["download test request", "download pdf", "download"],
    );
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

  async function sendPdfToApp(payload, base64, name) {
    if (!base64 || window.__qeManakPdfSent) return;
    window.__qeManakPdfSent = true;
    const result = {
      kind: RESULT_KIND,
      sampleId: text(payload.sampleId),
      sample_code: readSampleCodeFromPage() || lookup(payload, "sample.sample_code"),
      qr_code: lookup(payload, "sample.qr_code"),
      filledAt: Date.now(),
      pdfName: name || `Test_Request_${text(payload.sampleId) || "sample"}.pdf`,
      pdfBase64: base64,
    };
    try {
      const sent = chrome.runtime.sendMessage({ type: "QE_MANAK_PDF", result });
      if (sent && typeof sent.catch === "function") sent.catch(() => {});
    } catch {
      /* ignore */
    }
    showBanner("Test Request PDF sent to Consultancy Pro for attach.", true);
  }

  async function capturePdfFromUrl(payload, url) {
    if (!url || window.__qeManakPdfSent) return false;
    try {
      const res = await fetch(url, { credentials: "include" });
      const ct = (res.headers.get("content-type") || "").toLowerCase();
      const buf = await res.arrayBuffer();
      if (buf.byteLength < 80) return false;
      const head = String.fromCharCode.apply(null, new Uint8Array(buf.slice(0, 5)));
      if (!/pdf/i.test(ct) && !/\.pdf/i.test(url) && head !== "%PDF-") return false;
      await sendPdfToApp(payload, arrayBufferToBase64(buf), url.split("/").pop() || "");
      return true;
    } catch {
      return false;
    }
  }

  function findPdfUrlOnPage() {
    const anchors = Array.from(document.querySelectorAll("a[href], embed[src], iframe[src], object[data]"));
    for (const el of anchors) {
      const href = text(el.href || el.src || el.getAttribute("data") || "");
      if (!href || isBlockedUrl(href)) continue;
      if (/pdf/i.test(href)) return href;
    }
    return "";
  }

  function startPdfWatch(payload) {
    if (window.__qeManakPdfWatch) return;
    window.__qeManakPdfWatch = true;
    const origOpen = window.open;
    window.open = function (url, ...rest) {
      const href = String(url || "");
      if (isBlockedUrl(href)) {
        showBanner("Blocked BIS Play Store / app link.", false);
        return null;
      }
      if (href && /\.pdf($|\?)/i.test(href)) void capturePdfFromUrl(payload, href);
      return origOpen.call(window, url, ...rest);
    };
    const tick = () => {
      if (window.__qeManakPdfSent) return;
      const hooked = document.documentElement.getAttribute("data-qe-pdf-url") || "";
      if (hooked) void capturePdfFromUrl(payload, hooked);
      if (/\.pdf($|\?)/i.test(location.href) || document.contentType === "application/pdf") {
        void capturePdfFromUrl(payload, location.href);
        return;
      }
      const found = findPdfUrlOnPage();
      if (found) void capturePdfFromUrl(payload, found);
    };
    tick();
    const timer = window.setInterval(tick, 2000);
    window.setTimeout(() => window.clearInterval(timer), 15 * 60 * 1000);
  }

  function startCaptchaContinue(payload, mode) {
    if (window.__qeManakCaptchaWatch) return;
    window.__qeManakCaptchaWatch = true;
    const loginMode = mode === "login" || isLoginPage();
    const needsCaptcha = pageHasCaptcha() || loginMode;

    if (!loginMode && !needsCaptcha) {
      showBanner("Indian Standard selected. Page will not refresh until you click Submit.", true);
      startPdfWatch(payload);
      return;
    }

    let typedByUser = false;
    let debounce = 0;

    const tryContinue = async () => {
      if (window.__qeManakSubmitted) return;
      if (!typedByUser || !userFilledCaptcha()) return;
      window.__qeManakSubmitted = true;
      if (window.__qeManakCaptchaTimer) window.clearInterval(window.__qeManakCaptchaTimer);
      if (debounce) window.clearTimeout(debounce);
      const clicked = clickContinueAfterCaptcha();
      showBanner(
        clicked
          ? loginMode
            ? "Captcha accepted. Opening Home…"
            : "Captcha accepted. Submitting Test Request…"
          : "Captcha filled. Click Sign In / Submit if the page is waiting.",
        clicked,
      );
      if (!loginMode) {
        await sleep(1200);
        const confirmWrap = document.querySelector(".modal, .ui-dialog, [role='dialog']");
        const confirmBlob = normalize((confirmWrap && confirmWrap.textContent) || "");
        if (
          confirmWrap &&
          /test request|submit|save/.test(confirmBlob) &&
          !/play store|bis app|google play/.test(confirmBlob)
        ) {
          clickWhitelist(afterCaptchaMap().confirmLabels || ["confirm"]);
        }
        startPdfWatch(payload);
        window.setTimeout(() => {
          if (!window.__qeManakPdfSent) clickDownloadTestRequest();
        }, 2500);
      }
    };

    function bindInputs() {
      captchaInputs().forEach((el) => {
        if (el.dataset.qeCaptchaBound === "1") return;
        el.dataset.qeCaptchaBound = "1";
        const onType = (event) => {
          typedByUser = true;
          if (event && event.key === "Enter" && text(el.value).length >= 4) {
            void tryContinue();
            return;
          }
          if (text(el.value).length < 4) return;
          if (debounce) window.clearTimeout(debounce);
          debounce = window.setTimeout(() => void tryContinue(), loginMode ? 1200 : 700);
        };
        el.addEventListener("input", onType, true);
        el.addEventListener("keyup", onType, true);
        el.addEventListener("keydown", onType, true);
        el.addEventListener("paste", () => window.setTimeout(onType, 0), true);
      });
    }

    bindInputs();
    const obs = new MutationObserver(() => bindInputs());
    if (document.body) obs.observe(document.body, { childList: true, subtree: true });

    showBanner(
      loginMode
        ? "Type captcha when ready. Login starts as soon as you finish. Page will not refresh."
        : "Type captcha if asked. Submit waits until you type it.",
      true,
      true,
    );

    window.__qeManakCaptchaTimer = window.setInterval(() => {
      bindInputs();
    }, 800);

    window.setTimeout(() => obs.disconnect(), 30 * 60 * 1000);
  }

  function isValidSampleCode(value, qr) {
    const v = text(value);
    if (!v || v.length < 4 || v.length > 48) return false;
    if (/\s/.test(v)) return false;
    if (/laboratory|laboratories|gravitas|limited|private|hyderabad|kolkata|jaipur/i.test(v)) {
      return false;
    }
    if (!/^[A-Z0-9][A-Z0-9/._-]+$/i.test(v)) return false;
    if (qr && normalize(v) === normalize(qr)) return false;
    return true;
  }

  function readSampleCodeFromPage() {
    if (isTrPage() && !isTestRequestListPage() && !isViewOrPrintPage()) return "";
    const qr = "";
    const field = (map.fields || []).find((item) => item.key === "sample.sample_code");
    const el =
      findBySelectors((field && field.selectors) || []) ||
      findByLabels((field && field.labels) || []);
    if (el && isValidSampleCode(el.value || el.textContent, qr)) {
      return text(el.value || el.textContent);
    }

    const labeled = Array.from(document.querySelectorAll("td, th, label, span, b, strong, p, h3, h4")).find(
      (node) => /sample\s*code|test\s*request\s*(no|number|code)/i.test(node.textContent || "") &&
        (node.textContent || "").length < 80,
    );
    if (labeled) {
      const sib = labeled.nextElementSibling;
      const fromSib = sib ? text(sib.value || sib.textContent) : "";
      if (isValidSampleCode(fromSib, qr)) return fromSib;
    }

    const body = document.body ? document.body.innerText || "" : "";
    const patterns = [
      /sample\s*code\s*[:.\-]\s*([A-Z0-9][A-Z0-9/._-]{3,40})/i,
      /test\s*request\s*(?:no|number|code)\s*[:.\-]\s*([A-Z0-9][A-Z0-9/._-]{3,40})/i,
      /generated\s+(?:sample\s*code|tr\s*no)\s*[:.\-]\s*([A-Z0-9/._-]{4,40})/i,
    ];
    for (const re of patterns) {
      const match = body.match(re);
      if (match && isValidSampleCode(match[1], qr)) return match[1];
    }
    return "";
  }

  function publishResult(payload, sampleCode) {
    if (!isValidSampleCode(sampleCode, lookup(payload, "sample.qr_code"))) return;
    if (!sampleCode || window.__qeManakCaptured === sampleCode) return;
    window.__qeManakCaptured = sampleCode;
    const result = {
      kind: RESULT_KIND,
      sampleId: text(payload.sampleId),
      sample_code: sampleCode,
      qr_code: lookup(payload, "sample.qr_code"),
      filledAt: Date.now(),
    };
    try {
      const sent = chrome.runtime.sendMessage({ type: "QE_MANAK_RESULT", result });
      if (sent && typeof sent.catch === "function") sent.catch(() => {});
    } catch {
      /* ignore */
    }
    showBanner(`Sample Code ${sampleCode} sent back to Consultancy Pro.`, true);
    window.setTimeout(() => {
      if (!window.__qeManakPdfSent && isViewOrPrintPage()) requestSilentPdf(payload);
    }, 800);
  }

  function startWatchers(payload) {
    if (window.__qeManakWatch) return;
    window.__qeManakWatch = true;

    const tick = () => {
      fillQrIfPresent(payload);
      const hooked = document.documentElement.getAttribute("data-qe-pdf-url") || "";
      if (hooked) void capturePdfFromUrl(payload, hooked);
      if (isTestRequestListPage() || isViewOrPrintPage()) {
        const code = readSampleCodeFromPage();
        if (code && code !== lookup(payload, "sample.sample_code")) {
          publishResult(payload, code);
        }
      }
    };

    tick();
    const timer = window.setInterval(tick, 1500);
    const obs = new MutationObserver(() => tick());
    if (document.body) obs.observe(document.body, { childList: true, subtree: true });
    watchQrSubmitClicks();
    startListAndPrintFlow(payload);
    window.setTimeout(() => {
      window.clearInterval(timer);
      obs.disconnect();
      window.__qeManakWatch = false;
    }, 15 * 60 * 1000);
  }

  function isListButtonText(value) {
    const t = normalize(value);
    return /test\s*requests?\s*list/.test(t) && !/generate/.test(t);
  }

  function findTestRequestsListButton() {
    const mapped = ((map.navigation && map.navigation.testRequestList && map.navigation.testRequestList.labels) || []).map(
      normalize,
    );
    const nodes = Array.from(
      document.querySelectorAll(
        "a, button, input[type='button'], input[type='submit'], [role='button'], span, td",
      ),
    );
    const matches = nodes.filter((el) => {
      if (!el || isNeverClick(el)) return false;
      const visible = normalize(el.value || el.textContent || el.title || el.getAttribute("aria-label") || "");
      if (visible.length > 80) return false;
      if (isListButtonText(visible)) return true;
      if (mapped.some((label) => label && (visible === label || visible.includes(label)))) return true;
      const extra = [el.getAttribute("onclick"), el.getAttribute("href"), el.id]
        .map(normalize)
        .join(" ");
      return /testrequestlist|viewtestrequestlist|test.?requests?.?list/.test(extra);
    });
    if (!matches.length) return null;
    matches.sort((a, b) => {
      const aLen = normalize(a.value || a.textContent || "").length;
      const bLen = normalize(b.value || b.textContent || "").length;
      return aLen - bLen;
    });
    return (
      matches.find((el) => !el.closest("nav, .navbar, header, #mini-nav, .navbar-nav")) ||
      matches[0]
    );
  }

  function isTestRequestListPage() {
    const path = location.pathname.toLowerCase();
    if (/testrequestlist|viewapplicanttestrequestlist|trlist/i.test(path)) return true;
    if (/viewapplicanttestrequest(\?|$)/i.test(location.pathname + location.search)) return false;
    const heading = normalize(
      (document.querySelector("fieldset legend, h1, h2, h3, .page-header") || {}).textContent || "",
    );
    if (/test\s*request\s*details/.test(heading) && document.querySelector("table")) return true;
    const tables = Array.from(document.querySelectorAll("table"));
    return tables.some((table) => {
      const head = normalize(table.innerText || "").slice(0, 500);
      return (
        /sample\s*code/.test(head) &&
        /qr\s*code/.test(head) &&
        /view\s*test\s*request/.test(head)
      );
    });
  }

  function isViewOrPrintPage() {
    if (isTestRequestListPage()) return false;
    const path = (location.pathname + location.search).toLowerCase();
    if (/viewapplicanttestrequest(\?|$)/i.test(path)) return true;
    if (/printtestrequest|printapplicanttestrequest|testrequestdetail/i.test(path)) return true;
    return clickableCandidates().some((el) => {
      const t = normalize(el.textContent || el.value || "");
      return t === "print" || t === "print test request" || t === "download pdf";
    });
  }

  function pageLooksLikePostQrSubmit() {
    if (isTestRequestListPage() || isViewOrPrintPage()) return true;
    const t = normalize(document.body ? document.body.innerText : "");
    return /successfully|sent to the lab|test request generated|test request has been|qr code submitted|submitted successfully/i.test(
      t,
    );
  }

  function clickTestRequestList() {
    const match = findTestRequestsListButton();
    if (!match) return false;
    match.click();
    return true;
  }

  function headerIndex(table, re) {
    const head = table.querySelector("thead tr") || table.querySelector("tr");
    if (!head) return -1;
    const cells = Array.from(head.querySelectorAll("th, td"));
    return cells.findIndex((cell) => re.test(normalize(cell.textContent || "")));
  }

  function filterListByQr(qr) {
    const q = text(qr);
    if (!q) return;
    const filter = document.querySelector(
      "input[type='search'], input#filter, input[placeholder*='search' i], .footable input[type='text']",
    );
    if (!filter) return;
    if (text(filter.value) === q) return;
    setNativeValue(filter, q);
    filter.dispatchEvent(new Event("keyup", { bubbles: true }));
  }

  function findViewLink(row) {
    const nodes = Array.from(row.querySelectorAll("a, button, input, span"));
    return (
      nodes.find((el) => {
        const href = String(el.getAttribute("href") || el.href || "");
        return /viewapplicanttestrequest/i.test(href) && !/list/i.test(href);
      }) ||
      nodes.find((el) => {
        const t = normalize(el.textContent || el.value || el.title || el.getAttribute("aria-label") || "");
        return /^(view|viewable)$/.test(t) || t === "view test request";
      }) ||
      null
    );
  }

  function findListRow(payload) {
    const qr = lookup(payload, "sample.qr_code");
    if (qr) filterListByQr(qr);
    const tables = Array.from(document.querySelectorAll("table"));
    for (const table of tables) {
      const qrIdx = headerIndex(table, /qr\s*code/);
      const codeIdx = headerIndex(table, /sample\s*code/);
      const rows = Array.from(table.querySelectorAll("tbody tr, tr")).filter((row) =>
        row.querySelector("td"),
      );
      const byQr = qr
        ? rows.find((row) => {
            const cells = Array.from(row.querySelectorAll("td"));
            const blob = normalize(row.textContent || "");
            const qrCell = qrIdx >= 0 ? normalize(cells[qrIdx] && cells[qrIdx].textContent) : "";
            return blob.includes(normalize(qr)) || (qrCell && qrCell.includes(normalize(qr)));
          })
        : null;
      if (byQr) return { row: byQr, table, codeIdx, qr };
      const withView = rows.find((row) => Boolean(findViewLink(row)));
      if (withView) return { row: withView, table, codeIdx, qr };
    }
    return null;
  }

  function sampleCodeFromListRow(found) {
    if (!found) return "";
    const cells = Array.from(found.row.querySelectorAll("td"));
    if (found.codeIdx >= 0 && cells[found.codeIdx]) {
      const value = text(cells[found.codeIdx].textContent);
      if (isValidSampleCode(value, found.qr)) return value;
    }
    for (const cell of cells) {
      const value = text(cell.textContent);
      if (isValidSampleCode(value, found.qr)) return value;
    }
    return readSampleCodeFromPage();
  }

  function clickViewOnRow(row) {
    const view = findViewLink(row);
    if (!view) return false;
    const href = view.getAttribute("href") || view.href || "";
    if (href && /viewapplicanttestrequest/i.test(href) && !/^javascript:/i.test(href)) {
      try {
        const next = new URL(href, location.href);
        sessionStorage.setItem("qeManakViewClicked", "1");
        location.href = next.toString();
        return true;
      } catch {
        /* fall through */
      }
    }
    view.click();
    return true;
  }

  function requestSilentPdf(payload) {
    if (window.__qeManakPdfSent || window.__qeManakPdfAsked) return;
    window.__qeManakPdfAsked = true;
    const sampleCode = readSampleCodeFromPage() || lookup(payload, "sample.sample_code");
    const name = `Test_Request_${sampleCode || text(payload.sampleId) || "sample"}.pdf`.replace(
      /[^\w.\-]+/g,
      "_",
    );
    showBanner("Saving Test Request PDF into Consultancy Pro. Print dialog is not used.", true);
    const asked = chrome.runtime.sendMessage({
      type: "QE_MANAK_PRINT_PDF",
      result: {
        sampleId: text(payload.sampleId),
        sample_code: sampleCode,
        qr_code: lookup(payload, "sample.qr_code"),
        pdfName: name,
      },
    });
    Promise.resolve(asked)
      .then((res) => {
        if (res && res.base64) {
          void sendPdfToApp(payload, res.base64, res.name || name);
          return;
        }
        window.__qeManakPdfAsked = false;
        showBanner(
          "PDF capture needs the extension Reload (allow debugger). Do not use Print / Save as PDF.",
          false,
          true,
        );
      })
      .catch(() => {
        window.__qeManakPdfAsked = false;
      });
  }

  async function handleListPage(payload) {
    const found = findListRow(payload);
    if (!found) {
      showBanner("Test Request list is open. Matching the sample row…", true);
      return false;
    }
    const code = sampleCodeFromListRow(found);
    if (code) publishResult(payload, code);
    const clickedAt = Number(sessionStorage.getItem("qeManakViewClickedAt") || 0);
    if (sessionStorage.getItem("qeManakViewClicked") === "1" && Date.now() - clickedAt < 4000) {
      return true;
    }
    if (clickViewOnRow(found.row)) {
      sessionStorage.setItem("qeManakViewClicked", "1");
      sessionStorage.setItem("qeManakViewClickedAt", String(Date.now()));
      showBanner("Opening View Test Request for PDF…", true);
      return true;
    }
    return Boolean(code);
  }

  async function handleViewPrint(payload) {
    startPdfWatch(payload);
    const code = readSampleCodeFromPage();
    if (code) publishResult(payload, code);
    if (window.__qeManakPdfSent) return true;
    const pdfUrl =
      document.documentElement.getAttribute("data-qe-pdf-url") || findPdfUrlOnPage();
    if (pdfUrl) {
      await capturePdfFromUrl(payload, pdfUrl);
      if (window.__qeManakPdfSent) return true;
    }
    requestSilentPdf(payload);
    return true;
  }

  function startListAndPrintFlow(payload) {
    if (window.__qeManakListFlow) return;
    window.__qeManakListFlow = true;

    const tick = async () => {
      if (window.__qeManakPdfSent && window.__qeManakCaptured) return;
      if (isLoginPage()) return;

      if (isViewOrPrintPage()) {
        await handleViewPrint(payload);
        return;
      }

      if (isTestRequestListPage()) {
        await handleListPage(payload);
        return;
      }

      const listBtn = findTestRequestsListButton();
      const inNav = listBtn && listBtn.closest("nav, .navbar, header, #mini-nav, .navbar-nav");
      const qrDone =
        sessionStorage.getItem("qeManakQrSubmitted") === "1" ||
        sessionStorage.getItem("qeManakNeedList") === "1" ||
        pageLooksLikePostQrSubmit();
      const ready = qrDone || (listBtn && !inNav && sessionStorage.getItem("qeManakQrFilled") === "1");
      if (!ready || !listBtn) return;
      if (inNav && !qrDone) return;
      const clickedAt = Number(sessionStorage.getItem("qeManakListClickedAt") || 0);
      if (sessionStorage.getItem("qeManakListClicked") === "1") {
        if (Date.now() - clickedAt < 4000) return;
        sessionStorage.removeItem("qeManakListClicked");
      }
      if (clickTestRequestList()) {
        sessionStorage.setItem("qeManakNeedList", "1");
        sessionStorage.setItem("qeManakListClicked", "1");
        sessionStorage.setItem("qeManakListClickedAt", String(Date.now()));
        showBanner("Opening Test Requests List for Sample Code…", true);
      }
    };

    void tick();
    const timer = window.setInterval(() => void tick(), 1200);
    window.setTimeout(() => window.clearInterval(timer), 15 * 60 * 1000);
  }

  async function fillAndSearch(payload) {
    const isSearch = lookup(payload, "application.isSearch");
    const isNumber = lookup(payload, "application.isNumber") || isSearch;
    let selected = pageShowsSelectedIs(isNumber);
    let first = { filled: 0 };
    if (!selected && (isSearch || isNumber)) {
      first = fillPayload(payload, ["application.isSearch"]);
      await sleep(300);
      clickSearch();
      for (let i = 0; i < 14 && !selected; i += 1) {
        await sleep(500);
        selected = pageShowsSelectedIs(isNumber);
        if (!selected && isListItems().length) {
          selectIsResult(isNumber);
        }
      }
      await sleep(600);
      selected = pageShowsSelectedIs(isNumber);
    }
    const rest = fillPayload(payload);
    const dateField = (map.fields || []).find((item) => item.key === "sample.date_of_manufacturing");
    const dateEl =
      findBySelectors((dateField && dateField.selectors) || []) ||
      findByLabels((dateField && dateField.labels) || []);
    if (dateEl && lookup(payload, "sample.date_of_manufacturing")) {
      await fillDateField(dateEl, lookup(payload, "sample.date_of_manufacturing"));
    }
    if (selected || pageShowsSelectedIs(isNumber)) {
      await sleep(400);
      await pickLaboratory(payload);
    }
    const filled = (first.filled || 0) + (rest.filled || 0);
    showBanner(
      filled > 0
        ? selected
          ? `IS selected. Filled ${filled} field(s). Type captcha only if asked.`
          : `Filled ${filled} field(s). Check Indian Standard select if needed.`
        : rest.message,
      filled > 0 && selected,
    );
    return { ok: filled > 0, filled, selected };
  }

  function isExtensionOn() {
    return new Promise((resolve) => {
      chrome.storage.local.get(["qeManakEnabled"], (data) => {
        resolve(!data || data.qeManakEnabled !== false);
      });
    });
  }

  async function runWorkflow(payload, options) {
    const force = Boolean(options && options.force);
    if (!(await isExtensionOn())) {
      return { ok: false, message: "Extension is OFF." };
    }
    if (!payload) return { ok: false, message: "No QE_MANAK_TR_V1 payload." };

    const state = await readArmedState();
    if (!force && state.qeManakArmed !== true) {
      return { ok: false, message: "Extension auto-work is not armed." };
    }

    chrome.storage.local.set({ pendingFill: payload, qeManakArmed: true });
    const portal = state.qeManakPortal || {};
    const wantedUser = text(portal.userId || payload.portalUserId);

    if (isLoggedInSession() && isLoginPage() === false && !isTrPage()) {
      chrome.storage.local.set({ qeManakHomeReady: true });
    }

    if (isLoginPage()) {
      if (isLoggedInSession()) {
        chrome.storage.local.set({ qeManakHomeReady: true });
        sessionStorage.setItem("qeManakHomeReady", "1");
        sessionStorage.setItem("qeManakOpenedTr", "1");
        location.href = map.testRequestUrl || TR_URL;
        return { ok: true, message: "Already logged in. Opening Test Request." };
      }
      if (pageHasCaptcha()) {
        startCaptchaContinue(payload, "login");
        return { ok: true, message: "Waiting for login captcha. Page will not refresh." };
      }
      const onEbis = /ebislogin/i.test(location.pathname);
      if (!onEbis && wantedUser && sessionStorage.getItem("qeManakEbisRedirect") !== "1") {
        sessionStorage.setItem("qeManakEbisRedirect", "1");
        const next = new URL(map.loginUrl || "https://www.manakonline.in/MANAK/eBISLogin");
        next.searchParams.set("userId", wantedUser);
        if (text(portal.password)) next.searchParams.set("passwd", text(portal.password));
        location.href = next.toString();
        return { ok: true, message: "Opening eBIS login with User ID / Password filled." };
      }
      fillLoginFields(wantedUser, portal.password);
      startCaptchaContinue(payload, "login");
      return { ok: true, message: "Waiting for login captcha. Page will not refresh." };
    }

    const filledKey = fillSessionKey(payload);
    const alreadyFilled = sessionStorage.getItem(filledKey) === "1";
    const openedTr = sessionStorage.getItem("qeManakOpenedTr") === "1";

    if (isTestRequestListPage() || isViewOrPrintPage()) {
      startWatchers(payload);
      startPdfWatch(payload);
      showBanner(
        isTestRequestListPage()
          ? "List opened. Clicking View Test Request…"
          : "View Test Request opened. Downloading PDF…",
        true,
      );
      return { ok: true, message: "Finishing Sample Code / PDF." };
    }

    if (isHomePage() || (!isTrPage() && loggedInPortalUser())) {
      if (openedTr || alreadyFilled) {
        startWatchers(payload);
        startPdfWatch(payload);
        showBanner("Watching this page for Sample Code and Test Request PDF.", true);
        return { ok: true, message: "Watching for Sample Code / PDF." };
      }
      chrome.storage.local.set({ qeManakHomeReady: true });
      sessionStorage.setItem("qeManakHomeReady", "1");
      sessionStorage.setItem("qeManakOpenedTr", "1");
      showBanner("Already logged in. Opening Test Request…", true);
      location.href = map.testRequestUrl || TR_URL;
      return { ok: true, message: "Home reached. Opening Test Request." };
    }

    if (!isTrPage()) {
      if (openedTr || alreadyFilled) {
        startWatchers(payload);
        startPdfWatch(payload);
        return { ok: true, message: "Watching for Sample Code / PDF." };
      }
      location.href = map.homeUrl || HOME_URL;
      return { ok: true, message: "Opening Manak Home first." };
    }

    const homeReady =
      state.qeManakHomeReady === true || sessionStorage.getItem("qeManakHomeReady") === "1";
    if (!homeReady) {
      location.href = map.homeUrl || HOME_URL;
      return { ok: true, message: "Opening Home before Test Request fill." };
    }

    if (alreadyFilled) {
      startWatchers(payload);
      startPdfWatch(payload);
      startCaptchaContinue(payload, "tr");
      return { ok: true, message: "Already filled. Waiting for captcha / Submit." };
    }

    await sleep(400);
    const result = await fillAndSearch(payload);
    if (result.selected || result.filled > 0) {
      sessionStorage.setItem(filledKey, "1");
    }
    startWatchers(payload);
    startPdfWatch(payload);
    startCaptchaContinue(payload, "tr");
    return result;
  }

  function navigate(kind) {
    if (kind === "generateTestRequest") {
      location.href = map.testRequestUrl || TR_URL;
      return { ok: true, message: "Opening Test Request page." };
    }
    const nav = (map.navigation && map.navigation[kind]) || null;
    if (!nav) return { ok: false, message: "Unknown navigation." };
    const ok = clickByLabels(nav.labels);
    return {
      ok,
      message: ok ? `Opened ${kind}.` : `Could not find “${nav.labels[0]}” on this page.`,
    };
  }

  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (!msg || typeof msg !== "object") return;

    if (msg.type === "QE_MANAK_FILL") {
      const payload = msg.payload || parsePayload(msg.raw);
      void runWorkflow(payload, { force: true }).then((result) => {
        sendResponse(result || { ok: false, message: "Fill failed." });
      });
      return true;
    }

    if (msg.type === "QE_MANAK_FETCH_PDF") {
      const pending = msg.payload;
      void (async () => {
        const store = await new Promise((resolve) => {
          chrome.storage.local.get(["pendingFill"], (data) => resolve(data || {}));
        });
        const payload = pending || store.pendingFill;
        if (payload && msg.url) await capturePdfFromUrl(payload, msg.url);
        sendResponse({ ok: true });
      })();
      return true;
    }

    if (msg.type === "QE_MANAK_SESSION") {
      sendResponse({
        loggedIn: isLoggedInSession() && !isLoginPage(),
        userId: loggedInPortalUser(),
        onLogin: isLoginPage(),
        onHome: isHomePage(),
        onTr: isTrPage(),
      });
      return true;
    }

    if (msg.type === "QE_MANAK_NAV") {
      const result = navigate(msg.kind);
      showBanner(result.message, result.ok);
      sendResponse(result);
      return true;
    }
  });

  document.addEventListener(
    "click",
    (event) => {
      const link = event.target && event.target.closest ? event.target.closest("a[href]") : null;
      if (link && isBlockedUrl(link.href)) {
        event.preventDefault();
        event.stopPropagation();
        showBanner("Blocked BIS Play Store / app link.", false);
      }
    },
    true,
  );

  chrome.storage.local.get(["pendingFill", "qeManakEnabled", "qeManakArmed"], (data) => {
    if (!data || data.qeManakEnabled === false) return;
    if (data.qeManakArmed !== true) return;
    const pending = data.pendingFill;
    if (!pending) return;
    void runWorkflow(pending);
  });
})();
