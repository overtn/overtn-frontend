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
  if (!modal || !modalImage) return;
  document.addEventListener("click", (event) => {
    const img = event.target.closest("[data-zoom]");
    if (img) {
      modal.classList.add("active");
      modalImage.src = img.dataset.zoom;
    }
  });
  modal.addEventListener("click", (event) => {
    if (event.target === modal) modal.classList.remove("active");
  });
  const close = document.querySelector("[data-zoom-close]");
  close?.addEventListener("click", () => modal.classList.remove("active"));
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
