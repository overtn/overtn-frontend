(() => {
  const hidePreloader = () => {
    const preloader = document.getElementById("preloader");
    if (!preloader || preloader.dataset.hiding === "true") return;
    preloader.dataset.hiding = "true";
    preloader.classList.add("preloader-hidden");
    window.setTimeout(() => preloader.remove(), 420);
  };

  window.addEventListener("load", hidePreloader, { once: true });

  if (document.readyState === "complete") {
    hidePreloader();
  }
})();
