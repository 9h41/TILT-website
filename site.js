(function () {
  const params = new URLSearchParams(window.location.search);

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
      : isAndroid ? "android" : isIOS ? "ios" : window.matchMedia("(max-width: 767px)").matches ? "android" : "";

    hero.classList.toggle("hero-device--android", platform === "android");
    hero.classList.toggle("hero-device--ios", platform === "ios");
  }

  function loadAnalytics() {
    if (document.querySelector("script[data-tilt-analytics]")) return;

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

  function buildConsentBanner() {
    const consent = window.localStorage.getItem("tilt.analyticsConsent");
    if (consent === "accepted") {
      loadAnalytics();
      return;
    }
    if (consent === "declined") return;

    const template = document.getElementById("consent-template");
    const banner = template?.content.firstElementChild?.cloneNode(true);
    if (!banner) return;

    banner.querySelector('[data-consent-action="decline"]')?.addEventListener("click", () => {
      window.localStorage.setItem("tilt.analyticsConsent", "declined");
      banner.remove();
    });
    banner.querySelector('[data-consent-action="accept"]')?.addEventListener("click", () => {
      window.localStorage.setItem("tilt.analyticsConsent", "accepted");
      loadAnalytics();
      banner.remove();
    });

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

  applyDevicePlatform();
  bindConsentSettings();
  buildConsentBanner();
})();
