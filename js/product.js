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

const preloadImageSrc = (src) =>
  new Promise((resolve) => {
    const image = new Image();
    image.onload = resolve;
    image.onerror = resolve;
    image.src = src;
    if (image.complete) resolve();
  });

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
  let currentImageIndex = 0;
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
            data-zoom-full="${img}"
            data-zoom-index="${index}"
            ${index === 0 ? 'fetchpriority="high" decoding="async"' : 'loading="lazy" decoding="async"'}
          />
        </div>`
      )
      .concat(`
        <div class="mobile-product-gallery" data-mobile-gallery>
          <div class="mobile-gallery-main" data-mobile-gallery-main>
            <button class="mobile-gallery-arrow prev" type="button" data-mobile-gallery-prev aria-label="Предыдущее фото"></button>
            <img
              class="mobile-gallery-image"
              src="${images[0]}"
              alt="${product.name}"
              data-mobile-gallery-image
              data-zoom="${images[0]}"
              data-zoom-full="${images[0]}"
              data-zoom-index="0"
              fetchpriority="high"
              decoding="async"
            />
            <img class="mobile-gallery-image mobile-gallery-image-next" alt="" aria-hidden="true" data-mobile-gallery-incoming />
            <button class="mobile-gallery-arrow next" type="button" data-mobile-gallery-next aria-label="Следующее фото"></button>
          </div>
          <div class="mobile-gallery-thumbs" data-mobile-gallery-thumbs>
            ${images
              .map(
                (img, index) => `
                <button class="mobile-gallery-thumb ${index === 0 ? "active" : ""}" type="button" data-mobile-gallery-thumb="${index}" aria-label="Показать фото ${index + 1}">
                  <img src="${img}" alt="${product.name}" loading="lazy" decoding="async" />
                </button>`
              )
              .join("")}
          </div>
        </div>`)
      .join("");
  }

  const mobileGallery = galleryGrid?.querySelector("[data-mobile-gallery]");
  const mobileGalleryImage = galleryGrid?.querySelector("[data-mobile-gallery-image]");
  const mobileGalleryIncoming = galleryGrid?.querySelector("[data-mobile-gallery-incoming]");
  const mobileGalleryPrev = galleryGrid?.querySelector("[data-mobile-gallery-prev]");
  const mobileGalleryNext = galleryGrid?.querySelector("[data-mobile-gallery-next]");
  const mobileGalleryMain = galleryGrid?.querySelector("[data-mobile-gallery-main]");
  const mobileThumbs = Array.from(galleryGrid?.querySelectorAll("[data-mobile-gallery-thumb]") || []);
  let mobileGalleryAnimating = false;

  const syncMobileGallery = () => {
    if (!mobileGalleryImage) return;
    const image = images[currentImageIndex];
    mobileGalleryImage.src = image;
    mobileGalleryImage.dataset.zoom = image;
    mobileGalleryImage.dataset.zoomFull = image;
    mobileGalleryImage.dataset.zoomIndex = String(currentImageIndex);
    mobileGalleryImage.style.transform = "";
    mobileThumbs.forEach((thumb, index) => {
      thumb.classList.toggle("active", index === currentImageIndex);
    });
  };

  const resetMobileGalleryIncoming = () => {
    if (!mobileGalleryIncoming) return;
    mobileGalleryIncoming.classList.add("is-hidden", "no-transition");
    mobileGalleryIncoming.removeAttribute("src");
    mobileGalleryIncoming.style.transform = "";
  };

  const setMobileGalleryIndex = async (index, directionHint = 0) => {
    if (!images.length || mobileGalleryAnimating) return;
    const nextIndex = (index + images.length) % images.length;
    if (nextIndex === currentImageIndex) return;
    const direction = directionHint || (nextIndex > currentImageIndex ? 1 : -1);
    const nextImage = images[nextIndex];

    if (!mobileGalleryImage || !mobileGalleryIncoming) {
      currentImageIndex = nextIndex;
      syncMobileGallery();
      return;
    }

    mobileGalleryAnimating = true;
    await preloadImageSrc(nextImage);

    const outX = direction > 0 ? "-100%" : "100%";
    const inX = direction > 0 ? "100%" : "-100%";
    let fallback = 0;

    const finish = () => {
      clearTimeout(fallback);
      mobileGalleryIncoming.removeEventListener("transitionend", onDone);
      currentImageIndex = nextIndex;
      mobileGalleryImage.classList.add("no-transition");
      syncMobileGallery();
      resetMobileGalleryIncoming();
      mobileGalleryImage.offsetHeight;
      mobileGalleryImage.classList.remove("no-transition");
      mobileGalleryAnimating = false;
    };

    const onDone = (event) => {
      if (event.propertyName !== "transform") return;
      finish();
    };

    mobileGalleryIncoming.src = nextImage;
    mobileGalleryIncoming.classList.remove("is-hidden");
    mobileGalleryImage.classList.add("no-transition");
    mobileGalleryIncoming.classList.add("no-transition");
    mobileGalleryImage.style.transform = "translate3d(0, 0, 0)";
    mobileGalleryIncoming.style.transform = `translate3d(${inX}, 0, 0)`;
    mobileGalleryImage.offsetHeight;

    requestAnimationFrame(() => {
      mobileGalleryImage.classList.remove("no-transition");
      mobileGalleryIncoming.classList.remove("no-transition");
      mobileGalleryIncoming.addEventListener("transitionend", onDone);
      mobileGalleryImage.style.transform = `translate3d(${outX}, 0, 0)`;
      mobileGalleryIncoming.style.transform = "translate3d(0, 0, 0)";
      fallback = window.setTimeout(finish, 340);
    });
  };

  if (mobileGallery && images.length) {
    mobileGalleryPrev?.addEventListener("click", (event) => {
      event.stopPropagation();
      setMobileGalleryIndex(currentImageIndex - 1, -1);
    });

    mobileGalleryNext?.addEventListener("click", (event) => {
      event.stopPropagation();
      setMobileGalleryIndex(currentImageIndex + 1, 1);
    });

    mobileThumbs.forEach((thumb) => {
      thumb.addEventListener("click", (event) => {
        event.stopPropagation();
        const nextIndex = Number(thumb.dataset.mobileGalleryThumb || 0);
        setMobileGalleryIndex(nextIndex, nextIndex > currentImageIndex ? 1 : -1);
      });
    });

    let touchStartX = 0;
    let touchStartY = 0;
    mobileGalleryMain?.addEventListener(
      "touchstart",
      (event) => {
        if (event.touches.length !== 1) return;
        touchStartX = event.touches[0].clientX;
        touchStartY = event.touches[0].clientY;
      },
      { passive: true }
    );

    mobileGalleryMain?.addEventListener(
      "touchend",
      (event) => {
        const touch = event.changedTouches[0];
        if (!touch) return;
        const deltaX = touch.clientX - touchStartX;
        const deltaY = touch.clientY - touchStartY;
        if (Math.abs(deltaX) < 42 || Math.abs(deltaX) <= Math.abs(deltaY)) return;
        setMobileGalleryIndex(currentImageIndex + (deltaX < 0 ? 1 : -1), deltaX < 0 ? 1 : -1);
      },
      { passive: true }
    );
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

  const viewerIncomingImage = viewerImage.cloneNode(false);
  viewerIncomingImage.removeAttribute("data-viewer-image");
  viewerIncomingImage.setAttribute("aria-hidden", "true");
  viewerIncomingImage.classList.add("is-hidden", "no-transition");
  stage.appendChild(viewerIncomingImage);

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
  const mobileQuery = window.matchMedia?.("(max-width: 980px)");

  const clamp = (value, min, max) => Math.max(min, Math.min(value, max));

  const refreshImages = () => {
    zoomImages = Array.from(document.querySelectorAll("[data-gallery-grid] .gallery-item [data-zoom]"));
    zoomImages.forEach((img, index) => {
      img.dataset.zoomIndex = String(index);
    });
  };

  const setSlideX = (image, value) => {
    image.style.setProperty("--viewer-slide-x", value);
  };

  const applyZoom = () => {
    const clampedPan = clampPan(zoomScale, zoomX, zoomY);
    zoomScale = clampedPan.scale;
    zoomX = clampedPan.x;
    zoomY = clampedPan.y;
    viewerImage.style.setProperty("--viewer-zoom", String(zoomScale));
    viewerImage.style.setProperty("--viewer-pan-x", `${zoomX}px`);
    viewerImage.style.setProperty("--viewer-pan-y", `${zoomY}px`);
    viewer.classList.toggle("is-zoomed", zoomScale > 1.01);
  };

  const getFullImageSrc = (item) =>
    item.dataset.zoomFull || item.dataset.zoom || item.getAttribute("src") || item.currentSrc || item.src;

  const setImageSource = (image, item) => {
    const src = getFullImageSrc(item);
    image.removeAttribute("srcset");
    image.removeAttribute("sizes");
    image.src = src;
    image.alt = item.alt || "Фото товара";
  };

  const preloadImage = (src) =>
    new Promise((resolve) => {
      const image = new Image();
      image.onload = resolve;
      image.onerror = resolve;
      image.src = src;
      if (image.complete) resolve();
    });

  const cancelImageAnimation = () => {
    imageAnimationToken += 1;
    isImageAnimating = false;
    viewerImage.classList.remove("is-fading");
    setSlideX(viewerImage, "0%");
    resetViewerIncomingImage();
  };

  const resetViewerIncomingImage = () => {
    viewerIncomingImage.classList.add("is-hidden", "no-transition");
    viewerIncomingImage.removeAttribute("src");
    viewerIncomingImage.alt = "";
    setSlideX(viewerIncomingImage, "0%");
  };

  const clampPan = (scale, x, y) => {
    const safeScale = clamp(scale, 1, 4);
    if (safeScale <= 1.01) {
      return { scale: 1, x: 0, y: 0 };
    }

    const stageRect = stage.getBoundingClientRect();
    const imageWidth = viewerImage.offsetWidth || viewerImage.naturalWidth || stageRect.width;
    const imageHeight = viewerImage.offsetHeight || viewerImage.naturalHeight || stageRect.height;
    const maxX = Math.max(0, (imageWidth * safeScale - stageRect.width) / 2);
    const maxY = Math.max(0, (imageHeight * safeScale - stageRect.height) / 2);

    return {
      scale: safeScale,
      x: clamp(x, -maxX, maxX),
      y: clamp(y, -maxY, maxY),
    };
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
    setImageSource(viewerImage, item);
  };

  const openViewer = (index) => {
    refreshImages();
    if (!zoomImages.length) return;
    cancelImageAnimation();
    currentIndex = Math.max(0, Math.min(index, zoomImages.length - 1));
    viewerImage.classList.add("no-transition");
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
    cancelImageAnimation();
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

  const animateToIndex = async (nextIndex, direction) => {
    if (!zoomImages.length) return;
    if (isImageAnimating) return;
    const targetItem = zoomImages[nextIndex];
    if (!targetItem) return;
    isImageAnimating = true;
    const token = (imageAnimationToken += 1);
    resetZoom();
    const targetSrc = getFullImageSrc(targetItem);
    await preloadImage(targetSrc);
    if (token !== imageAnimationToken) return;

    if (prefersReducedMotion) {
      currentIndex = nextIndex;
      setSlideX(viewerImage, "0%");
      renderIndex();
      isImageAnimating = false;
      return;
    }

    if (mobileQuery?.matches) {
      const outX = direction > 0 ? "-100%" : "100%";
      const inX = direction > 0 ? "100%" : "-100%";
      let fallback = 0;

      const finish = () => {
        clearTimeout(fallback);
        viewerIncomingImage.removeEventListener("transitionend", onDone);
        if (token !== imageAnimationToken) return;
        currentIndex = nextIndex;
        viewerImage.classList.add("no-transition");
        setSlideX(viewerImage, "0%");
        renderIndex();
        resetViewerIncomingImage();
        viewerImage.offsetHeight;
        viewerImage.classList.remove("no-transition");
        isImageAnimating = false;
      };

      const onDone = (event) => {
        if (event.propertyName !== "transform") return;
        finish();
      };

      setImageSource(viewerIncomingImage, targetItem);
      viewerIncomingImage.classList.remove("is-hidden");
      viewerImage.classList.add("no-transition");
      viewerIncomingImage.classList.add("no-transition");
      setSlideX(viewerImage, "0%");
      setSlideX(viewerIncomingImage, inX);
      viewerImage.offsetHeight;

      requestAnimationFrame(() => {
        if (token !== imageAnimationToken) return;
        viewerImage.classList.remove("no-transition");
        viewerIncomingImage.classList.remove("no-transition");
        viewerIncomingImage.addEventListener("transitionend", onDone);
        setSlideX(viewerImage, outX);
        setSlideX(viewerIncomingImage, "0%");
        fallback = window.setTimeout(finish, 340);
      });
      return;
    }

    const outX = direction > 0 ? "-12px" : "12px";
    const inX = direction > 0 ? "12px" : "-12px";

    const waitForFade = () =>
      new Promise((resolve) => {
        let timeout = 0;
        const done = () => {
          clearTimeout(timeout);
          viewerImage.removeEventListener("transitionend", onDone);
          resolve();
        };
        const onDone = (event) => {
          if (event.propertyName !== "opacity") return;
          done();
        };
        viewerImage.addEventListener("transitionend", onDone);
        timeout = window.setTimeout(done, 220);
      });

    viewerImage.classList.remove("no-transition");
    setSlideX(viewerImage, outX);
    viewerImage.classList.add("is-fading");
    await waitForFade();
    if (token !== imageAnimationToken) return;

    currentIndex = nextIndex;
    viewerImage.classList.add("no-transition");
    setSlideX(viewerImage, inX);
    renderIndex();
    viewerImage.offsetHeight;

    requestAnimationFrame(() => {
      if (token !== imageAnimationToken) return;
      viewerImage.classList.remove("no-transition");
      setSlideX(viewerImage, "0%");
      viewerImage.classList.remove("is-fading");
    });
    await waitForFade();
    if (token !== imageAnimationToken) return;
    isImageAnimating = false;
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
    const index = zoomImages.includes(img) ? zoomImages.indexOf(img) : Number(img.dataset.zoomIndex || 0);
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
      const stageRect = stage.getBoundingClientRect();
      const stageCenterX = stageRect.left + stageRect.width / 2;
      const stageCenterY = stageRect.top + stageRect.height / 2;
      const gestureX = pinchStartCenterX - stageCenterX;
      const gestureY = pinchStartCenterY - stageCenterY;
      const nextScale = clamp(pinchStartScale * (distance / pinchStartDistance), 1, 4);
      const scaleRatio = nextScale / pinchStartScale;
      zoomScale = nextScale;
      zoomX = pinchStartX + center.x - pinchStartCenterX + (gestureX - pinchStartX) * (1 - scaleRatio);
      zoomY = pinchStartY + center.y - pinchStartCenterY + (gestureY - pinchStartY) * (1 - scaleRatio);
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

  window.addEventListener("resize", () => {
    if (!viewer.classList.contains("active")) return;
    applyZoom();
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
