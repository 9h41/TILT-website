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
    document.querySelectorAll("[data-i18n-aria-label]").forEach((el) => {
      el.setAttribute("aria-label", t(locale, el.dataset.i18nAriaLabel));
    });
    document.querySelectorAll("[data-appstore-badge]").forEach((img) => {
      img.setAttribute("src", `assets/badges/appstore-${locale}.svg`);
      img.onerror = function () {
        this.onerror = null;
        this.setAttribute("src", "assets/badges/appstore-en.svg");
      };
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

  function loadAnalytics() {
    if (document.querySelector('script[data-tilt-analytics]')) return;

    const script = document.createElement("script");
    script.async = true;
    script.src = "https://www.googletagmanager.com/gtag/js?id=G-ZT14P7S77B";
    script.dataset.tiltAnalytics = "true";
    document.head.appendChild(script);

    window.dataLayer = window.dataLayer || [];
    window.gtag = window.gtag || function gtag() { window.dataLayer.push(arguments); };
    window.gtag("js", new Date());
    window.gtag("config", "G-ZT14P7S77B");
  }

  function buildConsentBanner(locale) {
    const consent = window.localStorage.getItem("tilt.analyticsConsent");
    if (consent === "accepted") {
      loadAnalytics();
      return;
    }
    if (consent === "declined") return;

    const banner = document.createElement("aside");
    banner.className = "consent-banner";
    banner.setAttribute("role", "dialog");
    banner.setAttribute("aria-labelledby", "consent-title");

    const title = document.createElement("strong");
    title.id = "consent-title";
    title.textContent = t(locale, "consent.title");

    const message = document.createElement("p");
    message.textContent = t(locale, "consent.body");

    const privacy = document.createElement("a");
    privacy.href = "privacy.html";
    privacy.textContent = t(locale, "consent.privacy");

    const actions = document.createElement("div");
    actions.className = "consent-actions";

    const refuse = document.createElement("button");
    refuse.type = "button";
    refuse.className = "consent-button consent-button--secondary";
    refuse.textContent = t(locale, "consent.refuse");
    refuse.addEventListener("click", () => {
      window.localStorage.setItem("tilt.analyticsConsent", "declined");
      banner.remove();
    });

    const accept = document.createElement("button");
    accept.type = "button";
    accept.className = "consent-button";
    accept.textContent = t(locale, "consent.accept");
    accept.addEventListener("click", () => {
      window.localStorage.setItem("tilt.analyticsConsent", "accepted");
      loadAnalytics();
      banner.remove();
    });

    actions.append(refuse, accept);
    banner.append(title, message, privacy, actions);
    document.body.appendChild(banner);
  }

  function bindConsentSettings() {
    document.querySelectorAll("[data-consent-settings]").forEach((link) => {
      link.addEventListener("click", (event) => {
        event.preventDefault();
        window.localStorage.removeItem("tilt.analyticsConsent");
        window.location.reload();
      });
    });
  }

  const locale = pickLocale();
  buildSwitcher(locale);
  applyLocale(locale);
  bindConsentSettings();
  buildConsentBanner(locale);
})();
