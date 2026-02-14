(function () {
  const i18n = window.TILT_I18N;
  const params = new URLSearchParams(window.location.search);

  function pickLocale() {
    const fromQuery = params.get("lang");
    if (fromQuery && i18n.supported.includes(fromQuery)) return fromQuery;

    const fromStorage = window.localStorage.getItem("tilt.lang");
    if (fromStorage && i18n.supported.includes(fromStorage)) return fromStorage;

    const nav = (navigator.language || "en").slice(0, 2);
    return i18n.supported.includes(nav) ? nav : "en";
  }

  function t(locale, key) {
    return i18n.strings[locale]?.[key] ?? i18n.strings.en[key] ?? key;
  }

  function updateLinks(locale) {
    document.querySelectorAll("a[data-localized-link]").forEach((a) => {
      const url = new URL(a.getAttribute("href"), window.location.origin + window.location.pathname);
      url.searchParams.set("lang", locale);
      a.setAttribute("href", url.pathname + url.search);
    });
  }

  function applyLocale(locale) {
    window.localStorage.setItem("tilt.lang", locale);
    document.documentElement.setAttribute("lang", locale);

    document.querySelectorAll("[data-i18n]").forEach((el) => {
      el.textContent = t(locale, el.dataset.i18n);
    });
    document.querySelectorAll("[data-i18n-alt]").forEach((el) => {
      el.setAttribute("alt", t(locale, el.dataset.i18nAlt));
    });
    document.querySelectorAll("[data-screenshot-file]").forEach((img) => {
      const filename = img.dataset.screenshotFile;
      img.setAttribute("src", `assets/screenshots/${locale}/${filename}`);
      img.onerror = function () {
        this.onerror = null;
        this.setAttribute("src", `assets/screenshots/en/${filename}`);
      };
    });

    const bodyTitleKey = document.body.dataset.i18nTitle;
    if (bodyTitleKey) document.title = t(locale, bodyTitleKey);

    updateLinks(locale);

    const switcher = document.getElementById("lang-switcher");
    if (switcher && switcher.value !== locale) switcher.value = locale;
  }

  function buildSwitcher(initial) {
    const select = document.getElementById("lang-switcher");
    if (!select) return;

    select.innerHTML = "";
    i18n.supported.forEach((code) => {
      const opt = document.createElement("option");
      opt.value = code;
      opt.textContent = i18n.localeNames[code];
      select.appendChild(opt);
    });

    select.value = initial;
    select.addEventListener("change", (e) => {
      const next = e.target.value;
      const nextUrl = new URL(window.location.href);
      nextUrl.searchParams.set("lang", next);
      history.replaceState({}, "", nextUrl.pathname + nextUrl.search);
      applyLocale(next);
    });
  }

  const locale = pickLocale();
  buildSwitcher(locale);
  applyLocale(locale);
})();
