/**
 * Runs in the page (MAIN world) so Manak cannot open the BIS Play Store app.
 */
(function () {
  const blocked =
    /play\.google\.com|apps\.apple\.com|com\.bis\.app|itunes\.apple\.com|market:\/\/|intent:\/\//i;

  function blockedUrl(url) {
    return blocked.test(String(url || ""));
  }

  function isPdfLike(url) {
    const href = String(url || "");
    if (/testRequestGenerationForApplicant/i.test(href) && !/\.pdf/i.test(href)) return false;
    return /\.pdf($|\?)|generatePdf|printPdf|viewPdf|getPdf|downloadPdf|download.*pdf/i.test(href);
  }

  function rememberPdfUrl(url) {
    const href = String(url || "");
    if (!href || blockedUrl(href) || !isPdfLike(href)) return;
    document.documentElement.setAttribute("data-qe-pdf-url", href);
  }

  function lockOpen() {
    function safeOpen(url, name, specs) {
      if (blockedUrl(url)) return null;
      rememberPdfUrl(url);
      return window.__qeNativeOpen
        ? window.__qeNativeOpen.call(window, url, name, specs)
        : null;
    }
    if (!window.__qeNativeOpen) window.__qeNativeOpen = window.open;
    try {
      Object.defineProperty(window, "open", {
        configurable: true,
        writable: true,
        value: safeOpen,
      });
    } catch {
      window.open = safeOpen;
    }
  }

  lockOpen();
  window.setInterval(lockOpen, 1000);

  function lockPrint() {
    function silentPrint() {
      document.documentElement.setAttribute("data-qe-print-requested", "1");
      return false;
    }
    if (!window.__qeNativePrint) window.__qeNativePrint = window.print;
    try {
      Object.defineProperty(window, "print", {
        configurable: true,
        writable: true,
        value: silentPrint,
      });
    } catch {
      window.print = silentPrint;
    }
  }

  lockPrint();
  window.setInterval(lockPrint, 1000);

  function isCaptchaRefreshNode(el) {
    if (!el || el.nodeType !== 1) return false;
    const blob = [
      el.id,
      el.className,
      el.alt,
      el.title,
      el.getAttribute && el.getAttribute("onclick"),
      el.getAttribute && el.getAttribute("href"),
      el.src,
      el.textContent,
    ]
      .join(" ")
      .toLowerCase();
    if (/refreshcaptcha|reloadcaptcha|refresh captcha|reload captcha|new captcha/.test(blob)) {
      return true;
    }
    return el.tagName === "IMG" && /captcha|kaptcha/.test(blob);
  }

  document.addEventListener(
    "click",
    (event) => {
      const t = event.target;
      if (!t) return;
      if (isCaptchaRefreshNode(t) || (t.closest && isCaptchaRefreshNode(t.closest("a, button, img, span")))) {
        if (!event.isTrusted) {
          event.preventDefault();
          event.stopImmediatePropagation();
        }
      }
    },
    true,
  );

  document.addEventListener(
    "click",
    (event) => {
      const link = event.target && event.target.closest ? event.target.closest("a[href]") : null;
      if (!link) return;
      const href = link.href || link.getAttribute("href") || "";
      if (blockedUrl(href)) {
        event.preventDefault();
        event.stopImmediatePropagation();
        return;
      }
      rememberPdfUrl(href);
    },
    true,
  );

  function neutralizePlayLinks() {
    document
      .querySelectorAll(
        'a[href*="play.google.com"], a[href*="com.bis.app"], a[href*="apps.apple.com"], a[href*="market:"]',
      )
      .forEach((a) => {
        a.setAttribute("data-qe-blocked", a.getAttribute("href") || "");
        a.removeAttribute("href");
        a.setAttribute("target", "_self");
        a.onclick = function (event) {
          if (event) {
            event.preventDefault();
            event.stopPropagation();
          }
          return false;
        };
      });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", neutralizePlayLinks);
  } else {
    neutralizePlayLinks();
  }
  const obs = new MutationObserver(neutralizePlayLinks);
  obs.observe(document.documentElement, { childList: true, subtree: true });

  function parseParts(detail) {
    const day = Number(detail && detail.day);
    const month = Number(detail && detail.month);
    const year = Number(detail && detail.year);
    if (!day || !month || !year) return null;
    return { day, month, year, date: new Date(year, month - 1, day) };
  }

  function applyJqueryDate(el, parts, formats) {
    const $ = window.jQuery || window.$;
    if (!$ || !el) return false;
    const $el = $(el);
    try {
      if ($el.data("datepicker") || $el.hasClass("hasDatepicker")) {
        $el.datepicker("setDate", parts.date);
        $el.trigger("change").trigger("blur");
        return true;
      }
    } catch {
      /* ignore */
    }
    try {
      if ($el.data("DateTimePicker") && $el.data("DateTimePicker").date) {
        $el.data("DateTimePicker").date(parts.date);
        return true;
      }
    } catch {
      /* ignore */
    }
    try {
      if (typeof $el.datepicker === "function") {
        $el.datepicker("update", parts.date);
        $el.datepicker("setDate", parts.date);
        $el.val(formats[0] || "").trigger("change").trigger("input").trigger("blur");
        return Boolean($el.val());
      }
    } catch {
      /* ignore */
    }
    if (formats && formats.length) {
      $el.val(formats[0]).trigger("change").trigger("input").trigger("blur");
      return Boolean($el.val());
    }
    return false;
  }

  document.addEventListener("qe-manak-set-select", (event) => {
    const el = event.target;
    const value = String((event.detail && event.detail.value) || "").trim();
    const $ = window.jQuery || window.$;
    if (!el || !value || !$ || el.tagName !== "SELECT") return;
    const wanted = value.toLowerCase();
    const options = Array.from(el.options || []);
    const match = options.find((opt) => {
      const t = String(opt.textContent || "").trim().toLowerCase();
      const v = String(opt.value || "").trim().toLowerCase();
      if (!t || t.indexOf("select ") === 0) return false;
      return t === wanted || v === wanted || t.indexOf(wanted) >= 0 || wanted.indexOf(t) >= 0;
    });
    if (!match) return;
    if (el.multiple) $(el).val([match.value]).trigger("change");
    else $(el).val(match.value).trigger("change");
  });

  document.addEventListener("qe-manak-fill-date", (event) => {
    const el = event.target;
    const parts = parseParts(event.detail || {});
    if (!el || !parts) return;
    applyJqueryDate(el, parts, (event.detail && event.detail.formats) || []);
  });

  function isDigitsIn(blob, digits) {
    if (!digits) return false;
    return new RegExp("(?:^|[^0-9])" + digits + "(?:[^0-9]|$)").test(String(blob || ""));
  }

  document.addEventListener("qe-manak-pick-is", (event) => {
    const root = document.documentElement;
    const digits = String(
      (event.detail && event.detail.digits) || (root && root.getAttribute("data-qe-is-digits")) || "",
    );
    const year = String(
      (event.detail && event.detail.year) || (root && root.getAttribute("data-qe-is-year")) || "",
    );
    const items = Array.from(
      document.querySelectorAll("#mylist li.searchList, #results li.searchList, #standardResultsSet li, li.searchList"),
    );
    const match =
      items.find((li) => {
        const blob = String(li.id || "") + " " + String(li.textContent || "");
        if (!isDigitsIn(blob, digits)) return false;
        return !year || blob.indexOf(year) >= 0;
      }) ||
      items.find((li) => isDigitsIn(String(li.id || "") + " " + String(li.textContent || ""), digits)) ||
      null;
    if (!match) return;
    if (typeof window.setVal === "function") {
      window.setVal(match);
      return;
    }
    match.click();
  });

  function softLabKey(value) {
    return String(value || "")
      .toLowerCase()
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
    if (a.indexOf(b) >= 0 || b.indexOf(a) >= 0) return 80;
    const tokens = labTokens(wanted);
    if (!tokens.length) return 0;
    const hits = tokens.filter((t) => a.indexOf(t) >= 0).length;
    return Math.round((hits / tokens.length) * 70);
  }

  function filterLabTable(query) {
    const q = String(query || "").trim();
    if (!q) return false;
    const filter = document.getElementById("filter");
    if (filter) {
      filter.value = q;
      filter.dispatchEvent(new Event("input", { bubbles: true }));
      filter.dispatchEvent(new KeyboardEvent("keyup", { bubbles: true, key: "e" }));
    }
    const $ = window.jQuery || window.$;
    if ($ && $("#viewLab").length) {
      try {
        $("#filter").val(q).trigger("keyup").trigger("input").trigger("change");
      } catch {
        /* ignore */
      }
      try {
        const plugin = $("#viewLab").data("footable-filter");
        if (plugin && typeof plugin.filter === "function") plugin.filter(q);
      } catch {
        /* ignore */
      }
      try {
        $("#viewLab").trigger("footable_filter", { filter: q });
      } catch {
        /* ignore */
      }
    }
    return true;
  }

  function pickLabFromTable() {
    const root = document.documentElement;
    const wanted = String(root.getAttribute("data-qe-lab-name") || "");
    const query = String(root.getAttribute("data-qe-lab-filter") || "") || labTokens(wanted).slice(0, 2).join(" ");
    if (query) filterLabTable(query);
    const radios = Array.from(document.querySelectorAll("input[name='clickonlab']"));
    let best = null;
    let bestScore = 0;
    radios.forEach((el) => {
      const row = el.closest("tr");
      const nameCell = row && row.querySelector("[id='labnameval'], td:nth-child(3)");
      const blob = [(nameCell && nameCell.textContent) || "", (row && row.textContent) || "", el.value || ""].join(" ");
      let score = labMatchScore(blob, wanted);
      if (/osl/i.test(String(el.value || "")) && score > 0) score += 5;
      if (score > bestScore) {
        bestScore = score;
        best = el;
      }
    });
    const match = wanted
      ? bestScore >= 40
        ? best
        : null
      : radios.find((el) => /osl/i.test(String(el.value || ""))) || radios[0];
    if (!match) return false;
    match.checked = true;
    match.click();
    if (typeof window.selectFinalLab === "function") {
      window.selectFinalLab();
    } else {
      const btn = document.getElementById("selectFinalLab");
      if (btn) btn.click();
    }
    return true;
  }

  document.addEventListener("qe-manak-filter-lab", () => {
    filterLabTable(document.documentElement.getAttribute("data-qe-lab-filter") || "");
  });

  document.addEventListener("qe-manak-pick-lab", () => {
    pickLabFromTable();
  });

  function setPageInput(el, value) {
    if (!el || !value) return;
    const $ = window.jQuery || window.$;
    if ($ && typeof $.fn.val === "function") {
      $(el).val(value).trigger("input").trigger("change").trigger("keyup").trigger("blur");
      return;
    }
    const proto = el.tagName === "TEXTAREA" ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    const desc = Object.getOwnPropertyDescriptor(proto, "value");
    if (desc && desc.set) desc.set.call(el, value);
    else el.value = value;
    try {
      el.setAttribute("value", value);
    } catch {
      /* ignore */
    }
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
  }

  function fillManakLoginFields(userId, password) {
    const id = String(userId || "").trim();
    const pwd = String(password || "").trim();
    const user =
      document.getElementById("InputEmail") ||
      document.querySelector("input[name='userId'][type='text']");
    const pass =
      document.getElementById("InputPassword") ||
      document.querySelector("input[name='passwd'][type='password']");
    if (user && id) setPageInput(user, id);
    if (pass && pwd) setPageInput(pass, pwd);
  }

  document.addEventListener("qe-manak-fill-login", (event) => {
    const detail = (event && event.detail) || {};
    fillManakLoginFields(detail.userId, detail.password);
  });

  const labAttrWatch = new MutationObserver(() => {
    const root = document.documentElement;
    const query = root.getAttribute("data-qe-lab-filter") || "";
    const pick = root.getAttribute("data-qe-lab-pick") || "";
    if (query && query !== window.__qeLabFilterApplied) {
      window.__qeLabFilterApplied = query;
      filterLabTable(query);
    }
    if (pick && pick !== window.__qeLabPickApplied) {
      window.__qeLabPickApplied = pick;
      window.setTimeout(pickLabFromTable, 250);
    }
  });
  labAttrWatch.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-qe-lab-filter", "data-qe-lab-name", "data-qe-lab-pick"],
  });
})();
