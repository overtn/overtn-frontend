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

const formatDeliveryText = (text) =>
  `<div class="delivery-text">${String(text || "")
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
    deliveryContent.innerHTML = formatDeliveryText(
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
            data-zoom-index="${index}"
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
  let isImageAnimating = false;
  let imageAnimationToken = 0;
  let suppressStageClick = false;
  let lockedScrollY = 0;
  let zoomScale = 1;
  let zoomX = 0;
  let zoomY = 0;
  let panOriginX = 0;
  let panOriginY = 0;
  let pinchStartDistance = 0;
  let pinchStartScale = 1;
  let pinchStartCenterX = 0;
  let pinchStartCenterY = 0;
  let pinchStartX = 0;
  let pinchStartY = 0;
  const activePointers = new Map();
  const prefersReducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;

  const clamp = (value, min, max) => Math.max(min, Math.min(value, max));

  const refreshImages = () => {
    zoomImages = Array.from(document.querySelectorAll("[data-gallery-grid] [data-zoom]"));
    zoomImages.forEach((img, index) => {
      img.dataset.zoomIndex = String(index);
    });
  };

  const setSlideX = (value) => {
    viewerImage.style.setProperty("--viewer-slide-x", value);
  };

  const applyZoom = () => {
    viewerImage.style.setProperty("--viewer-zoom", String(zoomScale));
    viewerImage.style.setProperty("--viewer-pan-x", `${zoomX}px`);
    viewerImage.style.setProperty("--viewer-pan-y", `${zoomY}px`);
    viewer.classList.toggle("is-zoomed", zoomScale > 1.01);
  };

  const resetZoom = () => {
    zoomScale = 1;
    zoomX = 0;
    zoomY = 0;
    applyZoom();
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
    imageAnimationToken += 1;
    isImageAnimating = false;
    currentIndex = Math.max(0, Math.min(index, zoomImages.length - 1));
    viewerImage.classList.add("no-transition");
    setSlideX("0%");
    resetZoom();
    renderIndex();
    viewerImage.offsetHeight;
    viewerImage.classList.remove("no-transition");
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
    imageAnimationToken += 1;
    isImageAnimating = false;
    viewerImage.classList.add("no-transition");
    setSlideX("0%");
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
    resetZoom();
    resetPointer(true);
  };

  const animateToIndex = (nextIndex, direction) => {
    if (!zoomImages.length) return;
    if (isImageAnimating) return;
    isImageAnimating = true;
    const token = (imageAnimationToken += 1);
    resetZoom();

    if (prefersReducedMotion) {
      currentIndex = nextIndex;
      setSlideX("0%");
      renderIndex();
      isImageAnimating = false;
      return;
    }

    const outX = direction > 0 ? "-100%" : "100%";
    const inX = direction > 0 ? "100%" : "-100%";
    let outFallback = 0;
    let inFallback = 0;

    const finishIn = () => {
      if (token !== imageAnimationToken) return;
      clearTimeout(inFallback);
      viewerImage.removeEventListener("transitionend", onInDone);
      isImageAnimating = false;
    };

    const onInDone = (event) => {
      if (event.propertyName !== "transform") return;
      finishIn();
    };

    const finishOut = () => {
      if (token !== imageAnimationToken) return;
      clearTimeout(outFallback);
      viewerImage.removeEventListener("transitionend", onOutDone);
      currentIndex = nextIndex;
      viewerImage.classList.add("no-transition");
      setSlideX(inX);
      renderIndex();
      viewerImage.offsetHeight;
      requestAnimationFrame(() => {
        viewerImage.classList.remove("no-transition");
        viewerImage.addEventListener("transitionend", onInDone);
        setSlideX("0%");
        inFallback = window.setTimeout(finishIn, 280);
      });
    };

    const onOutDone = (event) => {
      if (event.propertyName !== "transform") return;
      finishOut();
    };

    viewerImage.classList.remove("no-transition");
    viewerImage.addEventListener("transitionend", onOutDone);
    setSlideX(outX);
    outFallback = window.setTimeout(finishOut, 280);
  };

  const showPrev = () => {
    if (!zoomImages.length) return;
    const nextIndex = (currentIndex - 1 + zoomImages.length) % zoomImages.length;
    animateToIndex(nextIndex, -1);
  };

  const showNext = () => {
    if (!zoomImages.length) return;
    const nextIndex = (currentIndex + 1) % zoomImages.length;
    animateToIndex(nextIndex, 1);
  };

  const resetPointer = (clearPointers = false) => {
    if (clearPointers) activePointers.clear();
    activePointerId = null;
    isPointerActive = false;
    isPointerSwipe = false;
    pointerStartX = 0;
    pointerStartY = 0;
    pointerDeltaX = 0;
    pointerDeltaY = 0;
    viewer.classList.remove("is-dragging");
  };

  const pointerValues = () => Array.from(activePointers.values());

  const pointerDistance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

  const pointerCenter = (a, b) => ({
    x: (a.x + b.x) / 2,
    y: (a.y + b.y) / 2,
  });

  const startPinch = () => {
    const [first, second] = pointerValues();
    if (!first || !second) return;
    const center = pointerCenter(first, second);
    pinchStartDistance = pointerDistance(first, second) || 1;
    pinchStartScale = zoomScale;
    pinchStartCenterX = center.x;
    pinchStartCenterY = center.y;
    pinchStartX = zoomX;
    pinchStartY = zoomY;
    isPointerSwipe = false;
    suppressStageClick = true;
  };

  const startSinglePointerGesture = (point) => {
    activePointerId = point.id;
    isPointerActive = true;
    isPointerSwipe = false;
    pointerStartX = point.x;
    pointerStartY = point.y;
    pointerDeltaX = 0;
    pointerDeltaY = 0;
    panOriginX = zoomX;
    panOriginY = zoomY;
  };

  document.addEventListener("click", (event) => {
    const img = event.target.closest("[data-zoom]");
    if (!img) return;
    refreshImages();
    const index = zoomImages.indexOf(img);
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
    activePointers.set(event.pointerId, { id: event.pointerId, x: event.clientX, y: event.clientY });
    if (activePointers.size === 1) {
      startSinglePointerGesture({ id: event.pointerId, x: event.clientX, y: event.clientY });
    } else if (activePointers.size === 2) {
      startPinch();
    }
    viewer.classList.add("is-dragging");
    stage.setPointerCapture?.(event.pointerId);
  });

  stage.addEventListener("pointermove", (event) => {
    if (!activePointers.has(event.pointerId)) return;
    activePointers.set(event.pointerId, { id: event.pointerId, x: event.clientX, y: event.clientY });

    if (activePointers.size >= 2) {
      const [first, second] = pointerValues();
      const distance = pointerDistance(first, second) || 1;
      const center = pointerCenter(first, second);
      zoomScale = clamp(pinchStartScale * (distance / pinchStartDistance), 1, 4);
      zoomX = pinchStartX + center.x - pinchStartCenterX;
      zoomY = pinchStartY + center.y - pinchStartCenterY;
      applyZoom();
      return;
    }

    if (!isPointerActive || event.pointerId !== activePointerId) return;
    pointerDeltaX = event.clientX - pointerStartX;
    pointerDeltaY = event.clientY - pointerStartY;

    if (zoomScale > 1.01) {
      zoomX = panOriginX + pointerDeltaX;
      zoomY = panOriginY + pointerDeltaY;
      applyZoom();
      if (Math.abs(pointerDeltaX) > 4 || Math.abs(pointerDeltaY) > 4) {
        suppressStageClick = true;
      }
      return;
    }

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
    const wasSinglePointer = activePointers.size === 1 && event.pointerId === activePointerId;
    const wasZoomed = zoomScale > 1.01;
    if (wasSinglePointer && !wasZoomed) {
      commitPointerGesture();
    } else {
      resetPointer();
    }
    activePointers.delete(event.pointerId);
    if (activePointers.size === 1) {
      const [remaining] = pointerValues();
      startSinglePointerGesture(remaining);
      viewer.classList.add("is-dragging");
    }
  });

  stage.addEventListener("pointercancel", (event) => {
    activePointers.delete(event.pointerId);
    if (!activePointers.size) resetPointer();
  });
  stage.addEventListener("lostpointercapture", (event) => {
    activePointers.delete(event.pointerId);
    if (!activePointers.size) resetPointer();
  });

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
