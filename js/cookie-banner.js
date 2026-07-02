(() => {
  const storageKey = "overtn_cookie_consent";
  const legacyStorageKey = "overtn_cookie_notice_accepted";
  const acceptedValue = "all";
  const necessaryValue = "necessary";
  const metrikaCounterId = 109499781;
  const metrikaScriptId = "overtn-yandex-metrika";

  const readConsent = () => {
    try {
      return localStorage.getItem(storageKey);
    } catch {
      return null;
    }
  };

  const saveConsent = (value) => {
    try {
      localStorage.setItem(storageKey, value);
      localStorage.removeItem(legacyStorageKey);
    } catch {
      // Consent is intentionally local-only. If storage is blocked, keep the site usable.
    }
  };

  const loadYandexMetrica = () => {
    if (window.ym && document.getElementById(metrikaScriptId)) return;

    const scriptUrl = `https://mc.yandex.ru/metrika/tag.js?id=${metrikaCounterId}`;
    (function(m, e, t, r, i, k, a) {
      m[i] = m[i] || function() {
        (m[i].a = m[i].a || []).push(arguments);
      };
      m[i].l = 1 * new Date();
      for (let j = 0; j < e.scripts.length; j += 1) {
        if (e.scripts[j].src === r) return;
      }
      k = e.createElement(t);
      a = e.getElementsByTagName(t)[0];
      k.async = true;
      k.id = metrikaScriptId;
      k.src = r;
      a.parentNode.insertBefore(k, a);
    })(window, document, "script", scriptUrl, "ym");

    window.ym(metrikaCounterId, "init", {
      ssr: true,
      webvisor: true,
      clickmap: true,
      ecommerce: "dataLayer",
      referrer: document.referrer,
      url: location.href,
      accurateTrackBounce: true,
      trackLinks: true,
    });
  };

  window.loadYandexMetrica = loadYandexMetrica;

  const hideBanner = (banner) => {
    banner?.remove();
  };

  const showBanner = () => {
    if (document.querySelector("[data-cookie-banner]")) return;

    const banner = document.createElement("div");
    banner.className = "cookie-banner";
    banner.setAttribute("data-cookie-banner", "");
    banner.innerHTML = `
      <div class="cookie-banner__title">Использование cookies</div>
      <div class="cookie-banner__text">Обязательные cookie нужны для работы сайта. Аналитические (Яндекс Метрика, включая Вебвизор) помогают нам улучшать сервис — только с вашего согласия.</div>
      <a class="cookie-banner__policy" href="/privacy/">Политика конфиденциальности</a>
      <div class="cookie-banner__actions">
        <button class="cookie-banner__button cookie-banner__button--primary" type="button" data-cookie-accept-all>Принять все</button>
        <button class="cookie-banner__button cookie-banner__button--secondary" type="button" data-cookie-necessary>Только необходимые</button>
      </div>
    `;

    banner.querySelector("[data-cookie-accept-all]")?.addEventListener("click", () => {
      saveConsent(acceptedValue);
      loadYandexMetrica();
      hideBanner(banner);
    });

    banner.querySelector("[data-cookie-necessary]")?.addEventListener("click", () => {
      saveConsent(necessaryValue);
      hideBanner(banner);
    });

    document.body.appendChild(banner);
  };

  const initCookieConsent = () => {
    const consent = readConsent();
    if (consent === acceptedValue) {
      loadYandexMetrica();
      return;
    }
    if (consent === necessaryValue) return;
    showBanner();
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initCookieConsent, { once: true });
  } else {
    initCookieConsent();
  }
})();
