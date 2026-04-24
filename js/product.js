const getProductSlug = () => {
  const params = new URLSearchParams(window.location.search);
  return params.get("id");
};

const formatTabText = (text) =>
  String(text || "")
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .map((paragraph) => `<p>${paragraph.replace(/[&<>]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[char]))}</p>`)
    .join("");

const formatCareText = (text) =>
  `<div class="care-text">${String(text || "")
    .split(/\n{2,}/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.replace(/[&<>]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[char])))
    .join("<br>")}</div>`;

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
    careContent.innerHTML = formatCareText(
      media.care || "Деликатный уход. Следуйте рекомендациям на внутренней бирке."
    );
  }
  if (deliveryContent) {
    deliveryContent.innerHTML = formatTabText(
      media.delivery || "Доставка до пункта выдачи: 2-5 рабочих дней по РФ."
    );
  }

  if (galleryGrid) {
    galleryGrid.innerHTML = images
      .map(
        (img, index) => `
        <div class="gallery-item">
          <img
            src="${img}"
            alt="${product.name}"
            data-zoom="${img}"
            ${index === 0 ? 'fetchpriority="high" decoding="async"' : 'loading="lazy" decoding="async"'}
          />
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
  const viewer = document.querySelector("[data-product-viewer]");
  const viewerImage = document.querySelector("[data-viewer-image]");
  const stage = document.querySelector("[data-viewer-stage]");
  const closeButton = document.querySelector("[data-viewer-close]");
  const prevButton = document.querySelector("[data-viewer-prev]");
  const nextButton = document.querySelector("[data-viewer-next]");
  if (!viewer || !viewerImage || !stage) return;

  let currentIndex = 0;
  let zoomImages = [];
  let pointerStartX = 0;
  let pointerStartY = 0;
  let pointerDeltaX = 0;
  let pointerDeltaY = 0;
  let isPointerActive = false;
  let isPointerSwipe = false;
  let activePointerId = null;
  let suppressStageClick = false;
  let lockedScrollY = 0;

  const refreshImages = () => {
    zoomImages = Array.from(document.querySelectorAll("[data-gallery-grid] [data-zoom]"));
    zoomImages.forEach((img, index) => {
      img.dataset.zoomIndex = String(index);
    });
  };

  const renderIndex = () => {
    const item = zoomImages[currentIndex];
    if (!item) return;
    viewerImage.src = item.dataset.zoom || item.src;
    viewerImage.alt = item.alt || "Фото товара";
  };

  const openViewer = (index) => {
    refreshImages();
    if (!zoomImages.length) return;
    currentIndex = Math.max(0, Math.min(index, zoomImages.length - 1));
    renderIndex();
    viewer.classList.add("active");
    viewer.setAttribute("aria-hidden", "false");
    lockedScrollY = window.scrollY || window.pageYOffset || 0;
    document.documentElement.classList.add("gallery-open");
    document.body.classList.add("gallery-open");
    document.body.style.position = "fixed";
    document.body.style.top = `-${lockedScrollY}px`;
    document.body.style.left = "0";
    document.body.style.right = "0";
    document.body.style.width = "100%";
  };

  const closeViewer = () => {
    viewer.classList.remove("active");
    viewer.setAttribute("aria-hidden", "true");
    document.documentElement.classList.remove("gallery-open");
    document.body.classList.remove("gallery-open");
    document.body.style.position = "";
    document.body.style.top = "";
    document.body.style.left = "";
    document.body.style.right = "";
    document.body.style.width = "";
    window.scrollTo(0, lockedScrollY);
    resetPointer();
  };

  const showPrev = () => {
    if (!zoomImages.length) return;
    currentIndex = (currentIndex - 1 + zoomImages.length) % zoomImages.length;
    renderIndex();
  };

  const showNext = () => {
    if (!zoomImages.length) return;
    currentIndex = (currentIndex + 1) % zoomImages.length;
    renderIndex();
  };

  const resetPointer = () => {
    activePointerId = null;
    isPointerActive = false;
    isPointerSwipe = false;
    pointerStartX = 0;
    pointerStartY = 0;
    pointerDeltaX = 0;
    pointerDeltaY = 0;
    viewer.classList.remove("is-dragging");
  };

  document.addEventListener("click", (event) => {
    const img = event.target.closest("[data-zoom]");
    if (!img) return;
    const index = Number(img.dataset.zoomIndex || 0);
    openViewer(index);
  });

  closeButton.addEventListener("click", closeViewer);
  prevButton?.addEventListener("click", showPrev);
  nextButton?.addEventListener("click", showNext);

  viewer.addEventListener("click", (event) => {
    if (suppressStageClick) {
      suppressStageClick = false;
      return;
    }
    if (event.target === viewer || event.target === stage) {
      closeViewer();
    }
  });

  stage.addEventListener("pointerdown", (event) => {
    if (!viewer.classList.contains("active")) return;
    if (event.pointerType === "mouse" && event.button !== 0) return;
    activePointerId = event.pointerId;
    isPointerActive = true;
    isPointerSwipe = false;
    pointerStartX = event.clientX;
    pointerStartY = event.clientY;
    pointerDeltaX = 0;
    pointerDeltaY = 0;
    viewer.classList.add("is-dragging");
    stage.setPointerCapture?.(event.pointerId);
  });

  stage.addEventListener("pointermove", (event) => {
    if (!isPointerActive || event.pointerId !== activePointerId) return;
    pointerDeltaX = event.clientX - pointerStartX;
    pointerDeltaY = event.clientY - pointerStartY;
    if (Math.abs(pointerDeltaX) > Math.abs(pointerDeltaY) && Math.abs(pointerDeltaX) > 8) {
      isPointerSwipe = true;
    }
  });

  const commitPointerGesture = () => {
    if (!isPointerActive) return;
    const absX = Math.abs(pointerDeltaX);
    const absY = Math.abs(pointerDeltaY);
    const shouldSlide = isPointerSwipe && absX >= 48 && absX > absY;
    const direction = pointerDeltaX;
    suppressStageClick = shouldSlide;
    resetPointer();
    if (!shouldSlide) return;
    if (direction < 0) {
      showNext();
    } else {
      showPrev();
    }
  };

  stage.addEventListener("pointerup", (event) => {
    if (event.pointerId !== activePointerId) return;
    commitPointerGesture();
  });

  stage.addEventListener("pointercancel", resetPointer);
  stage.addEventListener("lostpointercapture", resetPointer);

  document.addEventListener("keydown", (event) => {
    if (!viewer.classList.contains("active")) return;
    if (event.key === "Escape") {
      closeViewer();
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
};

initProductPage();
