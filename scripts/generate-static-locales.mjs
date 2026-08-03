import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";

const root = path.resolve(new URL("..", import.meta.url).pathname);
const origin = "https://tilt.9h41.org";
const pages = [
  {
    file: "index.html",
    titleKey: "meta.siteTitle",
    descriptionKey: "meta.siteDescription",
    keywordsKey: "meta.siteKeywords",
    changefreq: "weekly",
    priority: "1.0"
  },
  {
    file: "premium.html",
    titleKey: "premium.metaTitle",
    descriptionKey: "premium.metaDescription",
    keywordsKey: "premium.metaKeywords",
    changefreq: "monthly",
    priority: "0.8"
  },
  {
    file: "manifest.html",
    titleKey: "manifest.title",
    descriptionKey: "manifest.metaDescription",
    keywordsKey: "manifest.metaKeywords",
    changefreq: "monthly",
    priority: "0.7"
  },
  {
    file: "privacy.html",
    titleKey: "privacy.metaTitle",
    descriptionKey: "privacy.metaDescription",
    keywordsKey: "privacy.metaKeywords",
    changefreq: "yearly",
    priority: "0.5"
  },
  {
    file: "terms.html",
    titleKey: "terms.metaTitle",
    descriptionKey: "terms.metaDescription",
    keywordsKey: "terms.metaKeywords",
    changefreq: "yearly",
    priority: "0.5"
  }
];
const localeMap = {
  en: "en_US",
  de: "de_DE",
  es: "es_ES",
  fr: "fr_FR",
  it: "it_IT",
  nl: "nl_NL",
  pt: "pt_PT"
};

function loadI18n() {
  const context = { window: {} };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(root, "i18n.js"), "utf8"), context);
  return context.window.TILT_I18N;
}

const i18n = loadI18n();

function t(locale, key) {
  return i18n.strings[locale]?.[key] ?? i18n.strings.en[key] ?? key;
}

function htmlEscape(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function attrEscape(value) {
  return htmlEscape(value).replaceAll('"', "&quot;");
}

function pagePath(locale, file) {
  const page = file === "index.html" ? "" : file;
  if (locale === "en") return page ? `/${page}` : "/";
  return page ? `/${locale}/${page}` : `/${locale}/`;
}

function absoluteUrl(locale, file) {
  return `${origin}${pagePath(locale, file)}`;
}

function setAttribute(tag, attr, value) {
  const escaped = attrEscape(value);
  const pattern = new RegExp(`\\s${attr}="[^"]*"`);
  if (pattern.test(tag)) return tag.replace(pattern, ` ${attr}="${escaped}"`);
  return tag.replace(/>$/, ` ${attr}="${escaped}">`);
}

function localizeElements(html, locale) {
  return html.replace(
    /(<([a-z0-9]+)\b[^>]*\bdata-i18n="([^"]+)"[^>]*>)([\s\S]*?)(<\/\2>)/gi,
    (match, open, tagName, key, _content, close) => `${open}${htmlEscape(t(locale, key))}${close}`
  );
}

function localizeAttributes(html, locale) {
  return html
    .replace(/<[^>]*\bdata-i18n-alt="([^"]+)"[^>]*>/g, (tag, key) =>
      setAttribute(tag, "alt", t(locale, key))
    )
    .replace(/<[^>]*\bdata-i18n-aria-label="([^"]+)"[^>]*>/g, (tag, key) =>
      setAttribute(tag, "aria-label", t(locale, key))
    );
}

function setMetaName(html, name, value) {
  const escaped = attrEscape(value);
  const pattern = new RegExp(`(<meta name="${name}" content=")[^"]*(">)`);
  return html.replace(pattern, `$1${escaped}$2`);
}

function setMetaProperty(html, property, value) {
  const escaped = attrEscape(value);
  const pattern = new RegExp(`(<meta property="${property}" content=")[^"]*(">)`);
  return html.replace(pattern, `$1${escaped}$2`);
}

function rewriteSeo(html, locale, page) {
  const title = t(locale, page.titleKey);
  const description = t(locale, page.descriptionKey);
  const keywords = t(locale, page.keywordsKey);
  const url = absoluteUrl(locale, page.file);

  html = html.replace(/<html lang="[^"]*">/, `<html lang="${locale}">`);
  html = html.replace(/<title>[\s\S]*?<\/title>/, `<title>${htmlEscape(title)}</title>`);
  html = setMetaName(html, "description", description);
  html = setMetaName(html, "keywords", keywords);
  html = setMetaName(html, "twitter:title", title);
  html = setMetaName(html, "twitter:description", description);
  html = setMetaProperty(html, "og:title", title);
  html = setMetaProperty(html, "og:description", description);
  html = setMetaProperty(html, "og:url", url);
  html = setMetaProperty(html, "og:locale", localeMap[locale]);
  html = html.replace(/(<link rel="canonical" href=")[^"]*(">)/, `$1${url}$2`);
  html = html.replace(
    /<link rel="alternate" hreflang="([^"]+)" href="[^"]*">/g,
    (_match, hreflang) => {
      const href = hreflang === "x-default" ? absoluteUrl("en", page.file) : absoluteUrl(hreflang, page.file);
      return `<link rel="alternate" hreflang="${hreflang}" href="${href}">`;
    }
  );
  return html;
}

function rewriteStaticLocale(html, locale) {
  return html.replace(/<body([^>]*)>/, (match, attrs) => {
    if (attrs.includes("data-static-locale=")) {
      return match.replace(/data-static-locale="[^"]*"/, `data-static-locale="${locale}"`);
    }
    return `<body${attrs} data-static-locale="${locale}">`;
  });
}

function rewriteLocalizedLinks(html, locale) {
  return html.replace(/<a([^>]*\bdata-localized-link\b[^>]*)>/g, (tag, attrs) => {
    const hrefMatch = attrs.match(/\bhref="([^"]+)"/);
    if (!hrefMatch) return tag;
    const filename = hrefMatch[1].split("/").pop().split("?")[0] || "index.html";
    return setAttribute(tag, "href", pagePath(locale, filename));
  });
}

function rewriteLanguageSwitcher(html, locale, page) {
  const options = i18n.supported.map((code) => {
    const current = code === locale ? ' aria-current="page"' : "";
    return `      <a href="${pagePath(code, page.file)}" lang="${code}"${current}>${htmlEscape(i18n.localeNames[code])}</a>`;
  }).join("\n");
  const menu = [
    '        <details class="lang-menu">',
    `          <summary>${htmlEscape(i18n.localeNames[locale])}</summary>`,
    '          <nav class="lang-menu__options" aria-label="Languages">',
    options,
    "          </nav>",
    "        </details>"
  ].join("\n");

  return html.replace(
    /<select\b[^>]*\bid="lang-switcher"[^>]*>[\s\S]*?<\/select>|<details\b[^>]*\bclass="lang-menu"[^>]*>[\s\S]*?<\/details>/,
    menu
  );
}

function rewriteHeroScreenshots(html, locale) {
  return html.replace(/<img\b[^>]*\bdata-hero-screenshot="([^"]+)"[^>]*>/g, (tag, platform) =>
    setAttribute(tag, "src", `assets/hero/${platform}/${locale}.webp`)
  );
}

function rewriteConsentTemplate(html, locale, page) {
  const template = [
    '  <template id="consent-template">',
    '    <aside class="consent-banner" role="region" aria-labelledby="consent-title" aria-describedby="consent-message">',
    `      <strong id="consent-title">${htmlEscape(t(locale, "consent.title"))}</strong>`,
    `      <p id="consent-message">${htmlEscape(t(locale, "consent.body"))}</p>`,
    `      <a href="${pagePath(locale, "privacy.html")}">${htmlEscape(t(locale, "consent.privacy"))}</a>`,
    '      <div class="consent-actions">',
    `        <button type="button" class="consent-button consent-button--secondary" data-consent-action="decline">${htmlEscape(t(locale, "consent.refuse"))}</button>`,
    `        <button type="button" class="consent-button" data-consent-action="accept">${htmlEscape(t(locale, "consent.accept"))}</button>`,
    "      </div>",
    "    </aside>",
    "  </template>"
  ].join("\n");

  if (html.includes('id="consent-template"')) {
    return html.replace(/\s*<template id="consent-template">[\s\S]*?<\/template>/, `\n${template}`);
  }
  return html.replace(/\n\s*<script src="i18n\.js" defer><\/script>/, `\n${template}`);
}

function removeRuntimeI18n(html) {
  return html
    .replace(/\n\s*<script src="i18n\.js" defer><\/script>/, "")
    .replace(/\n\s*<script data-device-platform>[\s\S]*?<\/script>/, "")
    .replaceAll('<script src="site.js" defer></script>', '<script src="site.js"></script>');
}

function rewriteNestedAssets(html, locale) {
  if (locale === "en") return html;
  return html
    .replaceAll('href="styles.css"', 'href="../styles.css"')
    .replaceAll('src="i18n.js"', 'src="../i18n.js"')
    .replaceAll('src="site.js"', 'src="../site.js"')
    .replaceAll('href="assets/', 'href="../assets/')
    .replaceAll('src="assets/', 'src="../assets/');
}

function removeExternalFonts(html) {
  return html
    .replace(/\n\s*<link rel="preconnect" href="https:\/\/fonts\.googleapis\.com">/g, "")
    .replace(/\n\s*<link rel="preconnect" href="https:\/\/fonts\.gstatic\.com" crossorigin>/g, "")
    .replace(/\n\s*<link href="https:\/\/fonts\.googleapis\.com\/css2\?family=Manrope:[^"]+" rel="stylesheet">/g, "");
}

function rewriteIconAssets(html) {
  return html
    .replaceAll('content="https://tilt.9h41.org/assets/icon.png"', 'content="https://tilt.9h41.org/assets/og-image.png"')
    .replaceAll('<link rel="icon" href="assets/apple-touch-icon.png" type="image/png">', '<link rel="icon" href="assets/favicon.png" type="image/png">')
    .replaceAll('<link rel="icon" href="assets/icon.png" type="image/png">', '<link rel="icon" href="assets/favicon.png" type="image/png">')
    .replaceAll('<link rel="icon" href="assets/icon.svg" type="image/svg+xml">', '<link rel="icon" href="assets/favicon.png" type="image/png">')
    .replaceAll('<link rel="apple-touch-icon" href="assets/icon.png">', '<link rel="apple-touch-icon" href="assets/apple-touch-icon.png">')
    .replaceAll('src="assets/icon.svg"', 'src="assets/logo.webp"')
    .replaceAll('src="assets/icon.png"', 'src="assets/logo.webp"')
    .replaceAll('src="assets/apple-touch-icon.png"', 'src="assets/logo.webp"');
}

function rewriteStoreBadge(html, locale) {
  return html
    .replace(/(<img\b[^>]*\bdata-appstore-badge\b[^>]*\bsrc=")[^"]*("[^>]*>)/, `$1assets/badges/appstore-${locale}.svg$2`)
    .replace(/(<img\b[^>]*\bdata-appstore-badge\b)([^>]*)(>)/, (match, start, attrs, end) => {
      let tag = `${start}${attrs}${end}`;
      tag = setAttribute(tag, "width", "260");
      tag = setAttribute(tag, "height", "87");
      tag = setAttribute(tag, "decoding", "async");
      return tag;
    });
}

function rewriteStructuredData(html, locale, page) {
  if (page.file !== "index.html") return html;
  return html.replace(
    /<script type="application\/ld\+json">([\s\S]*?)<\/script>/,
    (_match, json) => {
      const data = JSON.parse(json);
      data.description = t(locale, "meta.siteDescription");
      data.url = absoluteUrl(locale, page.file);
      data.publisher.url = "https://9h41.org";
      return `<script type="application/ld+json">\n${JSON.stringify(data, null, 2)
        .split("\n")
        .map((line) => `    ${line}`)
        .join("\n")}\n  </script>`;
    }
  );
}

function renderPage(locale, page) {
  let html = fs.readFileSync(path.join(root, page.file), "utf8");
  html = rewriteSeo(html, locale, page);
  html = removeExternalFonts(html);
  html = rewriteIconAssets(html);
  html = rewriteStaticLocale(html, locale);
  html = localizeElements(html, locale);
  html = localizeAttributes(html, locale);
  html = rewriteLocalizedLinks(html, locale);
  html = rewriteLanguageSwitcher(html, locale, page);
  html = rewriteHeroScreenshots(html, locale);
  html = rewriteStoreBadge(html, locale);
  html = rewriteConsentTemplate(html, locale, page);
  html = removeRuntimeI18n(html);
  html = rewriteStructuredData(html, locale, page);
  html = rewriteNestedAssets(html, locale);
  return html;
}

function writeLocalizedPages() {
  for (const locale of i18n.supported) {
    for (const page of pages) {
      const html = renderPage(locale, page);
      const outputDir = locale === "en" ? root : path.join(root, locale);
      fs.mkdirSync(outputDir, { recursive: true });
      fs.writeFileSync(path.join(outputDir, page.file), html);
    }
  }
}

function sitemapEntry(locale, page) {
  const alternates = [
    ...i18n.supported.map((hreflang) =>
      `    <xhtml:link rel="alternate" hreflang="${hreflang}" href="${absoluteUrl(hreflang, page.file)}" />`
    ),
    `    <xhtml:link rel="alternate" hreflang="x-default" href="${absoluteUrl("en", page.file)}" />`
  ];
  return [
    "  <url>",
    `    <loc>${absoluteUrl(locale, page.file)}</loc>`,
    ...alternates,
    "    <lastmod>2026-08-01</lastmod>",
    `    <changefreq>${page.changefreq}</changefreq>`,
    `    <priority>${page.priority}</priority>`,
    "  </url>"
  ].join("\n");
}

function writeSitemap() {
  const entries = [];
  for (const locale of i18n.supported) {
    for (const page of pages) entries.push(sitemapEntry(locale, page));
  }
  const sitemap = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">',
    entries.join("\n"),
    "</urlset>",
    ""
  ].join("\n");
  fs.writeFileSync(path.join(root, "sitemap.xml"), sitemap);
}

writeLocalizedPages();
writeSitemap();
console.log(`Generated ${i18n.supported.length * pages.length} localized HTML pages and sitemap.xml.`);
