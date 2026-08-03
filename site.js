(function () {
  const i18n = window.TILT_I18N;
  const params = new URLSearchParams(window.location.search);

  function pickLocale() {
    const fromQuery = params.get("lang");
    if (fromQuery && i18n.supported.includes(fromQuery)) return fromQuery;

    const fromBody = document.body.dataset.staticLocale;
    if (fromBody && i18n.supported.includes(fromBody)) return fromBody;

    const fromPath = window.location.pathname.split("/").find((part) => i18n.supported.includes(part));
    if (fromPath) return fromPath;

    const fromStorage = window.localStorage.getItem("tilt.lang");
    if (fromStorage && i18n.supported.includes(fromStorage)) return fromStorage;

    const nav = (navigator.language || "en").slice(0, 2);
    return i18n.supported.includes(nav) ? nav : "en";
  }

  function t(locale, key) {
    return i18n.strings[locale]?.[key] ?? i18n.strings.en[key] ?? key;
  }

  function currentPagePath() {
    const parts = window.location.pathname.split("/").filter(Boolean);
    const filename = i18n.supported.includes(parts[0]) ? parts[1] ?? "" : parts[0] ?? "";
    return filename === "" || filename === "index.html" ? "/" : `/${filename}`;
  }

  function localizedUrl(locale) {
    const pagePath = currentPagePath();
    const localizedPath = locale === "en"
      ? pagePath
      : `/${locale}${pagePath === "/" ? "/" : pagePath}`;
    return new URL(localizedPath, "https://tilt.9h41.org").toString();
  }

  function canonicalUrl(locale) {
    return localizedUrl(locale);
  }

  function localizedPath(locale, pagePath = currentPagePath()) {
    if (locale === "en") return pagePath;
    return `/${locale}${pagePath === "/" ? "/" : pagePath}`;
  }

  function assetPath(path) {
    const isNestedLocalePage = i18n.supported.includes(window.location.pathname.split("/").filter(Boolean)[0]);
    return `${isNestedLocalePage ? "../" : ""}${path}`;
  }

  function applyDevicePlatform() {
    const hero = document.querySelector(".hero-device");
    if (!hero) return;

    const forcedDevice = params.get("device")?.toLowerCase();
    const userAgent = navigator.userAgent || "";
    const isAndroid = /Android/i.test(userAgent);
    const isIOS = /iPad|iPhone|iPod/i.test(userAgent)
      || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    const platform = ["android", "ios"].includes(forcedDevice)
      ? forcedDevice
      : isAndroid ? "android" : isIOS ? "ios" : "";

    hero.classList.toggle("hero-device--android", platform === "android");
    hero.classList.toggle("hero-device--ios", platform === "ios");
  }

  function applyHeroScreenshots(locale) {
    document.querySelectorAll("[data-hero-screenshot]").forEach((img) => {
      const platform = img.dataset.heroScreenshot;
      img.setAttribute("src", assetPath(`assets/hero/${platform}/${locale}.png`));
      img.onerror = function () {
        this.onerror = null;
        this.setAttribute("src", assetPath(`assets/hero/${platform}/en.png`));
      };
    });
  }

  function setMetaByName(name, value) {
    let meta = document.querySelector(`meta[name="${name}"]`);
    if (!meta) {
      meta = document.createElement("meta");
      meta.setAttribute("name", name);
      document.head.appendChild(meta);
    }
    if (meta && value) meta.setAttribute("content", value);
  }

  function setMetaByProperty(property, value) {
    let meta = document.querySelector(`meta[property="${property}"]`);
    if (!meta) {
      meta = document.createElement("meta");
      meta.setAttribute("property", property);
      document.head.appendChild(meta);
    }
    if (meta && value) meta.setAttribute("content", value);
  }

  function applySeo(locale) {
    const titleKey = document.body.dataset.i18nTitle;
    const descriptionKey = document.body.dataset.i18nDescription;
    const keywordsKey = document.body.dataset.i18nKeywords;
    const title = titleKey ? t(locale, titleKey) : document.title;
    const description = descriptionKey ? t(locale, descriptionKey) : "";
    const keywords = keywordsKey ? t(locale, keywordsKey) : "";
    const url = canonicalUrl(locale);
    const localeMap = {
      en: "en_US",
      de: "de_DE",
      es: "es_ES",
      fr: "fr_FR",
      it: "it_IT",
      nl: "nl_NL",
      pt: "pt_PT"
    };

    if (title) document.title = title;
    setMetaByName("description", description);
    setMetaByName("keywords", keywords);
    setMetaByName("twitter:title", title);
    setMetaByName("twitter:description", description);
    setMetaByProperty("og:title", title);
    setMetaByProperty("og:description", description);
    setMetaByProperty("og:url", url);
    setMetaByProperty("og:locale", localeMap[locale]);

    const canonical = document.querySelector('link[rel="canonical"]');
    if (canonical) canonical.setAttribute("href", url);

    document.querySelectorAll('link[rel="alternate"][hreflang]').forEach((link) => {
      const hreflang = link.getAttribute("hreflang");
      const href = hreflang === "x-default"
        ? localizedUrl("en")
        : localizedUrl(hreflang);
      link.setAttribute("href", href);
    });
  }

  function updateLinks(locale) {
    document.querySelectorAll("a[data-localized-link]").forEach((a) => {
      const href = a.getAttribute("href");
      const filename = href.split("/").pop().split("?")[0] || "index.html";
      const pagePath = filename === "index.html" ? "/" : `/${filename}`;
      a.setAttribute("href", localizedPath(locale, pagePath));
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
      img.setAttribute("src", assetPath(`assets/badges/appstore-${locale}.svg`));
      img.onerror = function () {
        this.onerror = null;
        this.setAttribute("src", assetPath("assets/badges/appstore-en.svg"));
      };
    });
    document.querySelectorAll("[data-screenshot-file]").forEach((img) => {
      const filename = img.dataset.screenshotFile;
      img.setAttribute("src", assetPath(`assets/screenshots/${locale}/${filename}`));
      img.onerror = function () {
        this.onerror = null;
        this.setAttribute("src", assetPath(`assets/screenshots/en/${filename}`));
      };
    });
    applyHeroScreenshots(locale);

    applySeo(locale);

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
      window.localStorage.setItem("tilt.lang", next);
      window.location.href = localizedPath(next);
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
  applyDevicePlatform();
  buildSwitcher(locale);
  applyLocale(locale);
  bindConsentSettings();
  buildConsentBanner(locale);
})();
