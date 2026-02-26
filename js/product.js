const getProductSlug = () => {
  const params = new URLSearchParams(window.location.search);
  return params.get("id");
};

const renderProduct = async () => {
  const slug = getProductSlug();
  if (!slug) throw new Error("Не указан id товара");
  const title = document.querySelector("[data-product-title]");
  const description = document.querySelector("[data-product-description]");
  if (title) title.textContent = "Загружаем товар…";
  if (description) description.textContent = "Сервер может просыпаться до 60 секунд.";

  let slowMessageTimer = setTimeout(() => {
    if (description) description.textContent = "Сервер просыпается. Подождите еще немного…";
  }, 10000);

  const product = await window.apiRequest(`/api/v1/catalog/products/${slug}`);
  clearTimeout(slowMessageTimer);
  const media = getProductMedia(product.slug);
  const images = media.gallery && media.gallery.length ? media.gallery : [media.cover, media.hover];
  const variantsBySize = new Map(product.variants.map((v) => [v.size, v]));
  const sizes = product.variants.map((v) => v.size);

  const price = document.querySelector("[data-product-price]");
  const galleryGrid = document.querySelector("[data-gallery-grid]");
  const sizesWrap = document.querySelector("[data-size-picker]");
  const careContent = document.querySelector("[data-tab-care]");
  const deliveryContent = document.querySelector("[data-tab-delivery]");

  if (title) title.textContent = product.name;
  if (price) {
    const minPrice = product.variants.length
      ? Math.min(...product.variants.map((v) => v.priceMinor))
      : 0;
    price.textContent = `${(minPrice / 100).toLocaleString("ru-RU")} RUB`;
  }
  if (description) description.textContent = product.description;
  if (careContent) {
    careContent.textContent =
      media.care || "Деликатный уход. Следуйте рекомендациям на внутренней бирке.";
  }
  if (deliveryContent) {
    deliveryContent.textContent =
      media.delivery || "Доставка до пункта выдачи: 2-5 рабочих дней по РФ.";
  }

  if (galleryGrid) {
    galleryGrid.innerHTML = images
      .map(
        (img) => `
        <div class="gallery-item">
          <img src="${img}" alt="${product.name}" data-zoom="${img}" />
        </div>`
      )
      .join("");
  }

  if (sizesWrap) {
    sizesWrap.innerHTML = sizes
      .map((size, index) => {
        const variant = variantsBySize.get(size);
        const available = (variant?.available ?? 0) > 0;
        const active = index === 0 && available ? "active" : "";
        return `<button type="button" class="${active}" data-size="${size}" ${available ? "" : "disabled"}>${size}${available ? "" : " · Нет в наличии"}</button>`;
      })
      .join("");
  }

  let selectedVariant = product.variants.find((v) => (v.available ?? 0) > 0) || product.variants[0];
  let selectedSize = selectedVariant?.size || sizes[0];
  const addBtn = document.querySelector("[data-add-to-cart]");

  const syncAddButtonState = () => {
    if (!addBtn) return;
    const available = (selectedVariant?.available ?? 0) > 0;
    addBtn.disabled = !available;
    addBtn.textContent = available ? "Добавить в корзину" : "Товар закончился";
  };

  sizesWrap?.querySelectorAll("button").forEach((btn) => {
    btn.addEventListener("click", () => {
      if (btn.disabled) {
        window.brandStore?.showToast?.("Товар закончился");
        return;
      }
      sizesWrap.querySelectorAll("button").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      selectedSize = btn.dataset.size;
      selectedVariant = variantsBySize.get(selectedSize);
      syncAddButtonState();
    });
  });

  syncAddButtonState();
  if (addBtn) {
    addBtn.addEventListener("click", () => {
      const added = window.brandStore?.addToCart(product, selectedSize);
      if (!added) {
        window.brandStore?.showToast?.("Товар закончился");
      }
      syncAddButtonState();
    });
  }
};

const initTabs = () => {
  const tabs = document.querySelectorAll("[data-tab-button]");
  const contents = document.querySelectorAll("[data-tab-content]");
  if (!tabs.length) return;

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      const target = tab.dataset.tabButton;
      tabs.forEach((t) => t.classList.toggle("active", t === tab));
      contents.forEach((content) => {
        content.style.display = content.dataset.tabContent === target ? "block" : "none";
      });
    });
  });
};

const initZoom = () => {
  const modal = document.querySelector("[data-zoom-modal]");
  const modalImage = document.querySelector("[data-zoom-image]");
  const zoomStage = document.querySelector(".zoom-stage");
  const prevButton = document.querySelector("[data-zoom-prev]");
  const nextButton = document.querySelector("[data-zoom-next]");
  const close = document.querySelector("[data-zoom-close]");
  if (!modal || !modalImage) return;

  let currentIndex = 0;
  let zoomImages = [];
  let previousBodyOverflow = "";
  let isZoomAnimating = false;

  const refreshImages = () => {
    zoomImages = Array.from(document.querySelectorAll("[data-gallery-grid] [data-zoom]"));
    zoomImages.forEach((img, index) => {
      img.dataset.zoomIndex = String(index);
    });
  };

  const renderIndex = () => {
    if (!zoomImages.length) return;
    const item = zoomImages[currentIndex];
    if (!item) return;
    modalImage.src = item.dataset.zoom || item.src;
    modalImage.alt = item.alt || "Zoom";
  };

  const openZoom = (index) => {
    refreshImages();
    if (!zoomImages.length) return;
    currentIndex = Math.max(0, Math.min(index, zoomImages.length - 1));
    renderIndex();
    modal.classList.add("active");
    previousBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
  };

  const closeZoom = () => {
    modal.classList.remove("active");
    document.body.style.overflow = previousBodyOverflow;
  };

  const showPrev = () => {
    if (!zoomImages.length || isZoomAnimating) return;
    const nextIndex = (currentIndex - 1 + zoomImages.length) % zoomImages.length;
    switchZoomImage(nextIndex, -1);
  };

  const showNext = () => {
    if (!zoomImages.length || isZoomAnimating) return;
    const nextIndex = (currentIndex + 1) % zoomImages.length;
    switchZoomImage(nextIndex, 1);
  };

  const switchZoomImage = (nextIndex, direction) => {
    if (!modalImage || typeof modalImage.animate !== "function") {
      currentIndex = nextIndex;
      renderIndex();
      return;
    }

    isZoomAnimating = true;
    const outX = direction > 0 ? -100 : 100;
    const inX = direction > 0 ? 100 : -100;
    const nextItem = zoomImages[nextIndex];
    const incomingImage = modalImage.cloneNode(true);
    incomingImage.src = nextItem?.dataset.zoom || nextItem?.src || "";
    incomingImage.alt = nextItem?.alt || "Zoom";
    incomingImage.style.transform = `translateX(${inX}%)`;
    modalImage.parentElement?.appendChild(incomingImage);

    Promise.all([
      modalImage.animate(
        [{ transform: "translateX(0)" }, { transform: `translateX(${outX}%)` }],
        { duration: 180, easing: "ease-out", fill: "forwards" }
      ).finished,
      incomingImage.animate(
        [{ transform: `translateX(${inX}%)` }, { transform: "translateX(0)" }],
        { duration: 180, easing: "ease-out", fill: "forwards" }
      ).finished
    ])
      .then(() => {
        currentIndex = nextIndex;
        renderIndex();
      })
      .catch(() => {
        currentIndex = nextIndex;
        renderIndex();
      })
      .finally(() => {
        incomingImage.remove();
        modalImage.style.transform = "";
        isZoomAnimating = false;
      });
  };

  document.addEventListener("click", (event) => {
    const img = event.target.closest("[data-zoom]");
    if (!img) return;
    const index = Number(img.dataset.zoomIndex || 0);
    openZoom(index);
  });

  modal.addEventListener("click", (event) => {
    if (event.target === modal) closeZoom();
  });
  zoomStage?.addEventListener("click", (event) => {
    if (event.target === zoomStage) closeZoom();
  });

  close?.addEventListener("click", closeZoom);
  prevButton?.addEventListener("click", showPrev);
  nextButton?.addEventListener("click", showNext);

  document.addEventListener("keydown", (event) => {
    if (!modal.classList.contains("active")) return;
    if (event.key === "Escape") {
      closeZoom();
      return;
    }
    if (event.key === "ArrowLeft") {
      showPrev();
      return;
    }
    if (event.key === "ArrowRight") {
      showNext();
    }
  });
};

const initProductPage = () => {
  renderProduct().catch((error) => {
    const title = document.querySelector("[data-product-title]");
    if (title) title.textContent = "Товар недоступен";
    const description = document.querySelector("[data-product-description]");
    if (description) description.textContent = error.message || "Ошибка загрузки товара";
  });
  initTabs();
  initZoom();
  window.brandStore?.updateCartCount();
  const cartBtn = document.querySelector("[data-cart-toggle]");
  if (cartBtn) {
    cartBtn.addEventListener("click", () => {
      if (window.brandStore?.toggleCartDrawer) {
        window.brandStore.toggleCartDrawer();
      } else {
        document.querySelector(".cart-drawer")?.classList.toggle("active");
        document.querySelector(".cart-overlay")?.classList.toggle("active");
      }
    });
  }
};

window.addEventListener("DOMContentLoaded", initProductPage);
