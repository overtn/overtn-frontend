(() => {
  const storageKey = "overtn_cookie_notice_accepted";
  if (localStorage.getItem(storageKey) === "true") return;

  const showBanner = () => {
    if (document.querySelector("[data-cookie-banner]")) return;

    const banner = document.createElement("div");
    banner.className = "cookie-banner";
    banner.setAttribute("data-cookie-banner", "");
    banner.innerHTML = `
      <div class="cookie-banner__title">Использование cookies</div>
      <div class="cookie-banner__text">Мы используем cookie для корректной работы сайта и анализа посещаемости.</div>
      <div class="cookie-banner__actions">
        <button class="cookie-banner__button" type="button" data-cookie-accept>Понятно</button>
        <a class="cookie-banner__link" href="/privacy/">Политика конфиденциальности</a>
      </div>
    `;

    banner.querySelector("[data-cookie-accept]")?.addEventListener("click", () => {
      localStorage.setItem(storageKey, "true");
      banner.remove();
    });

    document.body.appendChild(banner);
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", showBanner, { once: true });
  } else {
    showBanner();
  }
})();
