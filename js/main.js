let catalogProducts = [];

const initSlider = () => {
  const slider = document.querySelector("[data-slider]");
  if (!slider) return;

  slider.innerHTML = `
    <div class="slider-track" data-slider-track>
      ${sliderItems
    .map(
      (item, index) => `
      <a class="slide ${index === 0 ? "active" : ""}" href="${item.link}" data-slide-index="${index}">
        <div class="slide-content" style="background-image: url('${item.image}')">
          <h3>${item.title}</h3>
          <span>${item.subtitle}</span>
        </div>
      </a>`
    )
    .join("")}
    </div>`;

  let current = 0;
  const slides = Array.from(slider.querySelectorAll(".slide"));
  let isAnimating = false;
  const controls = document.querySelector("[data-slider-controls]");
  const dots = [];

  if (controls) {
    controls.innerHTML = slides
      .map(() => `<button type="button" data-slider-dot></button>`)
      .join("");
    controls.querySelectorAll("[data-slider-dot]").forEach((dot) => dots.push(dot));
  }

  slides.forEach((slide, index) => {
    slide.style.transform = index === 0 ? "translateX(0)" : "translateX(100%)";
  });

  const updateDots = (index) => {
    dots.forEach((dot, i) => dot.classList.toggle("active", i === index));
  };

  const goTo = (index, directionHint = null) => {
    if (isAnimating || index === current || !slides[index]) return;
    updateDots(index);
    isAnimating = true;
    dots.forEach((dot) => (dot.disabled = true));
    const currentSlide = slides[current];
    const nextSlide = slides[index];
    const isWrapForward = current === slides.length - 1 && index === 0;
    const isWrapBackward = current === 0 && index === slides.length - 1;
    const direction = directionHint || (isWrapForward ? 1 : isWrapBackward ? -1 : index > current ? 1 : -1);

    nextSlide.classList.add("active");
    nextSlide.style.transition = "none";
    nextSlide.style.transform = `translateX(${direction * 100}%)`;

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        currentSlide.style.transition = "transform 0.5s ease";
        nextSlide.style.transition = "transform 0.5s ease";
        currentSlide.style.transform = `translateX(${-direction * 100}%)`;
        nextSlide.style.transform = "translateX(0)";
      });
    });

    const onDone = () => {
      currentSlide.classList.remove("active");
      currentSlide.style.transition = "none";
      currentSlide.style.transform = `translateX(${-direction * 100}%)`;
      nextSlide.style.transition = "";
      current = index;
      isAnimating = false;
      dots.forEach((dot) => (dot.disabled = false));
    };

    nextSlide.addEventListener("transitionend", onDone, { once: true });
  };

  const next = () => goTo((current + 1) % slides.length, 1);
  const prev = () => goTo((current - 1 + slides.length) % slides.length, -1);

  let autoplayTimer = null;
  let autoplayResumeTimer = null;

  const clearAutoplay = () => {
    if (autoplayTimer) {
      clearInterval(autoplayTimer);
      autoplayTimer = null;
    }
    if (autoplayResumeTimer) {
      clearTimeout(autoplayResumeTimer);
      autoplayResumeTimer = null;
    }
  };

  const startAutoplay = () => {
    clearAutoplay();
    autoplayTimer = setInterval(next, 5000);
  };

  const pauseAutoplay = () => {
    clearAutoplay();
    autoplayResumeTimer = setTimeout(() => {
      startAutoplay();
    }, 5000);
  };

  dots.forEach((dot, i) => {
    dot.addEventListener("click", () => {
      pauseAutoplay();
      goTo(i);
    });
  });

  if (window.matchMedia("(max-width: 980px)").matches) {
    let touchStartX = 0;
    let touchStartY = 0;
    let touchDeltaX = 0;
    let touchDeltaY = 0;
    let isSwipeCandidate = false;

    slider.addEventListener(
      "touchstart",
      (event) => {
        const touch = event.touches[0];
        if (!touch) return;
        touchStartX = touch.clientX;
        touchStartY = touch.clientY;
        touchDeltaX = 0;
        touchDeltaY = 0;
        isSwipeCandidate = true;
      },
      { passive: true }
    );

    slider.addEventListener(
      "touchmove",
      (event) => {
        if (!isSwipeCandidate) return;
        const touch = event.touches[0];
        if (!touch) return;
        touchDeltaX = touch.clientX - touchStartX;
        touchDeltaY = touch.clientY - touchStartY;
        if (Math.abs(touchDeltaY) > Math.abs(touchDeltaX)) {
          isSwipeCandidate = false;
        }
      },
      { passive: true }
    );

    slider.addEventListener("touchend", () => {
      if (!isSwipeCandidate || isAnimating) {
        isSwipeCandidate = false;
        return;
      }
      const absX = Math.abs(touchDeltaX);
      const absY = Math.abs(touchDeltaY);
      if (absX < 40 || absX <= absY) {
        isSwipeCandidate = false;
        return;
      }
      pauseAutoplay();
      if (touchDeltaX < 0) {
        next();
      } else {
        prev();
      }
      isSwipeCandidate = false;
    });

    slider.addEventListener("touchcancel", () => {
      isSwipeCandidate = false;
    });
  } else {
    let dragStartX = 0;
    let dragDeltaX = 0;
    let isPointerDown = false;
    let isDragging = false;
    let suppressClick = false;

    const resetDesktopDrag = () => {
      isPointerDown = false;
      isDragging = false;
      dragStartX = 0;
      dragDeltaX = 0;
      slider.classList.remove("is-dragging");
    };

    slider.classList.add("is-draggable");

    slider.addEventListener("mousedown", (event) => {
      if (event.button !== 0 || isAnimating) return;
      isPointerDown = true;
      isDragging = false;
      dragStartX = event.clientX;
      dragDeltaX = 0;
      slider.classList.add("is-dragging");
    });

    window.addEventListener("mousemove", (event) => {
      if (!isPointerDown) return;
      dragDeltaX = event.clientX - dragStartX;
      if (Math.abs(dragDeltaX) > 6) {
        isDragging = true;
      }
    });

    window.addEventListener("mouseup", () => {
      if (!isPointerDown) return;
      const absX = Math.abs(dragDeltaX);
      const shouldSwitch = isDragging && absX >= 40 && !isAnimating;
      const direction = dragDeltaX;
      suppressClick = isDragging;
      resetDesktopDrag();
      if (!shouldSwitch) return;
      pauseAutoplay();
      if (direction < 0) {
        next();
      } else {
        prev();
      }
    });

    slider.addEventListener("mouseleave", () => {
      if (!isPointerDown) return;
      const absX = Math.abs(dragDeltaX);
      const shouldSwitch = isDragging && absX >= 40 && !isAnimating;
      const direction = dragDeltaX;
      suppressClick = isDragging;
      resetDesktopDrag();
      if (!shouldSwitch) return;
      pauseAutoplay();
      if (direction < 0) {
        next();
      } else {
        prev();
      }
    });

    slider.addEventListener("click", (event) => {
      if (!suppressClick) return;
      suppressClick = false;
      event.preventDefault();
      event.stopPropagation();
    }, true);
  }

  startAutoplay();
  updateDots(0);
};

const formatApiError = (error, fallback) => {
  if (error?.message) return `${fallback}: ${error.message}`;
  return fallback;
};

const getProductImageAttrs = (index, kind = "base") => {
  const attrs = ['decoding="async"'];
  if (kind === "hover" || index > 1) {
    attrs.push('loading="lazy"');
  }
  return attrs.join(" ");
};

const initProducts = async () => {
  const grid = document.querySelector("[data-products]");
  if (!grid) return;
  grid.innerHTML = `<div class="muted">Загружаем товары. Если сервер только что запустился, это может занять до 60 секунд…</div>`;
  const slowTimer = setTimeout(() => {
    grid.innerHTML = `<div class="muted">Сервер просыпается. Пожалуйста, подождите еще немного…</div>`;
  }, 10000);
  try {
    const products = await window.apiRequest("/api/v1/catalog/products");
    clearTimeout(slowTimer);
    catalogProducts = products;
    grid.innerHTML = products
      .map((product, index) => `
      <a class="product-card" href="/product/?id=${product.slug}">
        <div class="product-media">
          <img class="base" src="${getProductMedia(product.slug).cover}" alt="${product.name}" ${getProductImageAttrs(index, "base")} />
          <img class="hover" src="${getProductMedia(product.slug).hover}" alt="${product.name}" ${getProductImageAttrs(index, "hover")} />
        </div>
        <div class="product-info">
          <h4>${product.name}</h4>
          <span>${product.variants[0] ? `${(product.variants[0].priceMinor / 100).toLocaleString("ru-RU")} RUB` : "Нет в наличии"}</span>
        </div>
      </a>`)
      .join("");
    if (!products.length) {
      grid.innerHTML = `<div class="muted">Товары пока не добавлены.</div>`;
    }
  } catch (error) {
    clearTimeout(slowTimer);
    grid.innerHTML = `<div class="muted">${formatApiError(error, "Не удалось загрузить товары")}</div>`;
  }
};

const syncHeroHeights = () => {
  const heroMain = document.querySelector(".hero-main");
  const sliderPanel = document.querySelector(".hero-slider-panel");
  if (!heroMain || !sliderPanel) return;
  if (window.matchMedia("(max-width: 980px)").matches) {
    heroMain.style.height = "";
    return;
  }
  const height = sliderPanel.getBoundingClientRect().height;
  if (height) heroMain.style.height = `${height}px`;
};

const initHomePage = () => {
  initSlider();
  initProducts();
  syncHeroHeights();
};

initHomePage();
window.addEventListener("resize", () => syncHeroHeights());
