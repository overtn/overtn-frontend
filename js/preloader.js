(() => {
  const hidePreloader = () => {
    const preloader = document.getElementById("preloader");
    if (!preloader || preloader.dataset.hiding === "true") return;
    preloader.dataset.hiding = "true";
    preloader.classList.add("preloader-hidden");
    window.setTimeout(() => preloader.remove(), 420);
  };

  if (document.readyState === "loading") {
    window.addEventListener("DOMContentLoaded", hidePreloader, { once: true });
  } else {
    hidePreloader();
  }

  window.addEventListener("load", hidePreloader, { once: true });

  if (document.readyState === "complete") {
    hidePreloader();
  }
})();
