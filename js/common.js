const cartKey = "brand-cart";

const getCart = () => JSON.parse(localStorage.getItem(cartKey) || "[]");
const setCart = (items) => localStorage.setItem(cartKey, JSON.stringify(items));

const updateCartCount = () => {
  const count = getCart().reduce((sum, item) => sum + item.qty, 0);
  document.querySelectorAll("[data-cart-count]").forEach((badge) => {
    badge.textContent = count;
    badge.classList.toggle("show", count > 0);
  });
};

const showToast = (text) => {
  const toast = document.querySelector(".toast");
  if (!toast) return;
  toast.textContent = text;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 2200);
};

const renderCartDrawer = () => {
  const list = document.querySelector("[data-cart-items]");
  const totalEl = document.querySelector("[data-cart-total]");
  const discountEl = document.querySelector("[data-cart-discount]");
  const checkoutLink = document.querySelector("[data-checkout-link]");
  if (!list || !totalEl) return;
  const cart = getCart();
  list.innerHTML = "";
  let total = 0;

  cart.forEach((item) => {
    const row = document.createElement("div");
    row.className = "cart-item";
    row.innerHTML = `
      <img src="${item.image}" alt="${item.name}" loading="lazy" decoding="async" />
      <div class="cart-meta">
        <span>${item.name}</span>
        <div class="cart-qty">
          <button type="button" data-cart-action="decrease" data-id="${item.id}" data-size="${item.size}">−</button>
          <span>${item.qty}</span>
          <button type="button" data-cart-action="increase" data-id="${item.id}" data-size="${item.size}">+</button>
        </div>
      </div>
      <div class="cart-meta">
        <span>${item.price}</span>
        <button class="cart-remove" type="button" data-cart-action="remove" data-id="${item.id}" data-size="${item.size}">×</button>
      </div>
    `;
    list.appendChild(row);
    total += item.numericPrice * item.qty;
  });

  const hasBoth = cart.some((item) => item.id === "over-big-sweatpants") && cart.some((item) => item.id === "over-sweatshirt");
  let discount = 0;
  if (hasBoth) discount = total * 0.1;
  const finalTotal = Math.max(total - discount, 0);

  if (discountEl) {
    discountEl.textContent = hasBoth ? `Скидка 10% за комплект: -${discount.toLocaleString("ru-RU")} RUB` : "";
  }

  if (cart.length === 0) {
    totalEl.textContent = "Корзина пуста. Добавьте в корзину хотя бы один товар";
    totalEl.closest(".cart-summary")?.classList.add("empty");
  } else {
    totalEl.textContent = `${finalTotal.toLocaleString("ru-RU")} RUB`;
    totalEl.closest(".cart-summary")?.classList.remove("empty");
  }

  if (checkoutLink) {
    checkoutLink.classList.toggle("disabled", cart.length === 0);
    checkoutLink.setAttribute("aria-disabled", cart.length === 0 ? "true" : "false");
  }
};

const toggleCartDrawer = (forceOpen = null) => {
  const drawer = document.querySelector(".cart-drawer");
  const overlay = document.querySelector(".cart-overlay");
  if (!drawer || !overlay) return;
  const shouldOpen = forceOpen === null ? !drawer.classList.contains("active") : forceOpen;
  drawer.classList.toggle("active", shouldOpen);
  overlay.classList.toggle("active", shouldOpen);
  renderCartDrawer();
};

const updateItemQty = (id, size, delta) => {
  const cart = getCart();
  const item = cart.find((entry) => entry.id === id && entry.size === size);
  if (!item) return;
  if (delta > 0 && typeof item.availableQty === "number" && item.qty >= item.availableQty) {
    showToast("Товар закончился");
    return;
  }
  item.qty += delta;
  if (item.qty <= 0) {
    const next = cart.filter((entry) => !(entry.id === id && entry.size === size));
    setCart(next);
  } else {
    setCart(cart);
  }
  updateCartCount();
  renderCartDrawer();
};

const removeItem = (id, size) => {
  const cart = getCart().filter((entry) => !(entry.id === id && entry.size === size));
  setCart(cart);
  updateCartCount();
  renderCartDrawer();
};

const addToCart = (product, size = null) => {
  const sizeLabel = size || product.variants?.[0]?.size || null;
  const matchedVariant = product.variants?.find((v) => v.size === sizeLabel) || product.variants?.[0];
  if (!matchedVariant) {
    showToast("Нет доступных вариантов");
    return false;
  }
  const cart = getCart();
  const available = typeof matchedVariant.available === "number"
    ? matchedVariant.available
    : Math.max((matchedVariant.stockOnHand || 0) - (matchedVariant.stockReserved || 0), 0);
  const inCartQty = cart
    .filter((item) => item.variantId === matchedVariant.id)
    .reduce((sum, item) => sum + (item.qty || 0), 0);
  if (available <= inCartQty) {
    showToast("Товар закончился");
    return false;
  }
  const existing = cart.find((item) => item.variantId === matchedVariant.id);
  if (existing) {
    existing.qty += 1;
  } else {
    const media = getProductMedia(product.slug);
    const image = media.cover;
    cart.push({
      id: product.slug,
      variantId: matchedVariant.id,
      name: `${product.name}${sizeLabel ? ` (${sizeLabel})` : ""}`,
      price: `${(matchedVariant.priceMinor / 100).toLocaleString("ru-RU")} RUB`,
      numericPrice: matchedVariant.priceMinor / 100,
      qty: 1,
      size: sizeLabel,
      image,
      availableQty: available,
    });
  }
  setCart(cart);
  updateCartCount();
  renderCartDrawer();
  showToast("Товар добавлен в корзину");
  return true;
};

const initCartActions = () => {
  const cartBtn = document.querySelector("[data-cart-toggle]");
  if (cartBtn) cartBtn.addEventListener("click", () => toggleCartDrawer());
  const closeBtn = document.querySelector("[data-cart-close]");
  if (closeBtn) closeBtn.addEventListener("click", () => toggleCartDrawer(false));
  const overlay = document.querySelector(".cart-overlay");
  if (overlay) overlay.addEventListener("click", () => toggleCartDrawer(false));

  const checkoutLink = document.querySelector("[data-checkout-link]");
  if (checkoutLink) {
    checkoutLink.addEventListener("click", (event) => {
      if (checkoutLink.classList.contains("disabled")) {
        event.preventDefault();
      }
    });
  }

  const list = document.querySelector("[data-cart-items]");
  list?.addEventListener("click", (event) => {
    const btn = event.target.closest("[data-cart-action]");
    if (!btn) return;
    const id = btn.dataset.id;
    const size = btn.dataset.size || null;
    const action = btn.dataset.cartAction;
    if (action === "increase") updateItemQty(id, size, 1);
    if (action === "decrease") updateItemQty(id, size, -1);
    if (action === "remove") removeItem(id, size);
  });
};

const initTrackingModal = () => {
  const trigger = document.querySelector("[data-tracking-open]");
  const modal = document.querySelector("[data-tracking-modal]");
  const close = document.querySelector("[data-tracking-close]");
  if (!trigger || !modal) return;
  trigger.addEventListener("click", (event) => {
    event.preventDefault();
    modal.classList.add("active");
  });
  close?.addEventListener("click", () => modal.classList.remove("active"));
  modal.addEventListener("click", (event) => {
    if (event.target === modal) modal.classList.remove("active");
  });
};

const initCommonUi = () => {
  initCartActions();
  initTrackingModal();
  updateCartCount();
};

window.addEventListener("DOMContentLoaded", initCommonUi);

window.brandStore = { addToCart, getCart, setCart, updateCartCount, toggleCartDrawer, showToast, renderCartDrawer };
