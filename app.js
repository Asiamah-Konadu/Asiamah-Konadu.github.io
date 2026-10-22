// Maxwellina Foods — Client-Side Storefront & WhatsApp Checkout
(function () {
  "use strict";

  const WHATSAPP_ORDER_NUMBER = "233553774381";
  const CART_STORAGE_KEY = "maxwellina-cart";

  const PRODUCT_CATALOG = {
    bofrot: {
      name: "Bofrot Mix",
      price: 35
    },
    pancake: {
      name: "Pancake Mix",
      price: 35
    }
  };

  // State
  let cart = {};

  // DOM Elements
  const cartToggleBtn = document.getElementById("cart-open");
  const cartDrawer = document.getElementById("cart-drawer");
  const cartBackdrop = document.getElementById("cart-backdrop");
  const closeCartBtn = document.getElementById("cart-close");
  const cartItemsContainer = document.getElementById("cart-items-container");
  const cartCountEl = document.getElementById("cart-count");
  const checkoutBackdrop = document.getElementById("checkout-backdrop");
  const closeCheckoutBtn = document.getElementById("checkout-close");
  const openCheckoutBtn = document.getElementById("open-checkout-modal");
  const checkoutForm = document.getElementById("checkout-form");
  const checkoutTotalEl = document.getElementById("checkout-total-amount");
  const checkoutErrorEl = document.getElementById("checkout-error");
  const mobileMenuToggle = document.getElementById("mobile-menu-toggle");
  const mobileMenuLayer = document.getElementById("mobile-menu-layer");
  const mobileMenuBackdrop = document.getElementById("mobile-menu-backdrop");
  const closeMobileMenuBtn = document.getElementById("close-mobile-menu");

  function normalizePhone(value) {
    let digits = String(value || "").replace(/[^\d+]/g, "");
    if (digits.startsWith("00")) digits = "+" + digits.slice(2);
    if (digits.startsWith("0")) digits = "+233" + digits.slice(1);
    else if (digits.startsWith("233")) digits = "+" + digits;
    return /^\+233[235]\d{8}$/.test(digits) ? digits : "";
  }

  function formatPrice(amount) {
    return "GH₵" + amount.toFixed(2).replace(/\.00$/, "");
  }

  function saveCart() {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
    } catch (e) {
      console.error("Unable to save cart to localStorage", e);
    }
  }

  function loadCart() {
    try {
      const raw = localStorage.getItem(CART_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)) {
          const restored = {};
          for (const [key, qty] of Object.entries(parsed)) {
            if (PRODUCT_CATALOG[key] && typeof qty === "number" && qty > 0 && qty <= 99) {
              restored[key] = Math.floor(qty);
            }
          }
          cart = restored;
        }
      }
    } catch (e) {
      console.error("Unable to restore cart from localStorage", e);
    }
  }

  function getCartSummary() {
    const entries = Object.entries(cart).filter(([, q]) => q > 0);
    const count = entries.reduce((sum, [, q]) => sum + q, 0);
    const total = entries.reduce((sum, [key, q]) => {
      const price = PRODUCT_CATALOG[key] ? PRODUCT_CATALOG[key].price : 35;
      return sum + price * q;
    }, 0);
    return { entries, count, total };
  }

  function updateScrollLock() {
    const isCartOpen = cartDrawer && cartDrawer.classList.contains("is-open");
    const isCheckoutOpen = checkoutBackdrop && checkoutBackdrop.classList.contains("is-open");
    const isMobileMenuOpen = mobileMenuLayer && mobileMenuLayer.classList.contains("is-open");

    if (isCartOpen || isCheckoutOpen || isMobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
  }

  function renderCart() {
    const { entries, count, total } = getCartSummary();

    if (cartCountEl) {
      cartCountEl.textContent = count;
    }
    if (cartToggleBtn) {
      cartToggleBtn.setAttribute(
        "aria-label",
        "Open your order, " + count + (count === 1 ? " item" : " items")
      );
    }

    if (!cartItemsContainer) return;

    if (entries.length === 0) {
      cartItemsContainer.innerHTML = `
        <div class="empty-cart">
          <span>✳</span>
          <p>Your basket is waiting for something lovely.</p>
          <a href="#products" class="cart-find-link">Find a mix</a>
        </div>
      `;
      const findLink = cartItemsContainer.querySelector(".cart-find-link");
      if (findLink) {
        findLink.addEventListener("click", () => closeCart());
      }
      return;
    }

    let itemsHtml = '<div class="cart-items">';
    entries.forEach(([key, qty]) => {
      const product = PRODUCT_CATALOG[key];
      if (!product) return;
      itemsHtml += `
        <div class="cart-item">
          <div>
            <p class="cart-item-title">${product.name}</p>
            <span class="cart-item-price">${formatPrice(product.price)} each</span>
          </div>
          <div class="quantity-controls">
            <button type="button" data-action="decrease" data-product="${key}" aria-label="Remove one ${product.name}">−</button>
            <span>${qty}</span>
            <button type="button" data-action="increase" data-product="${key}" aria-label="Add one ${product.name}">+</button>
          </div>
        </div>
      `;
    });
    itemsHtml += `</div>
      <div class="cart-summary">
        <div class="cart-total">
          <span>Product total</span>
          <strong>${formatPrice(total)}</strong>
        </div>
        <p>Product total only. Delivery arrangements and any fee will be confirmed with you separately.</p>
        <button class="button button-dark checkout-button" id="open-checkout-modal" type="button">
          Continue to WhatsApp <span aria-hidden="true">↗</span>
        </button>
        <p class="checkout-note">Payment and delivery details will be confirmed in WhatsApp.</p>
      </div>
    `;

    cartItemsContainer.innerHTML = itemsHtml;

    // Attach event listeners for + / - inside cart
    cartItemsContainer.querySelectorAll("button[data-action]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const prod = btn.getAttribute("data-product");
        const act = btn.getAttribute("data-action");
        if (act === "increase") updateQuantity(prod, 1);
        else if (act === "decrease") updateQuantity(prod, -1);
      });
    });

    // Attach listener for Continue to WhatsApp button
    const contBtn = cartItemsContainer.querySelector("#open-checkout-modal");
    if (contBtn) {
      contBtn.addEventListener("click", () => {
        closeCart();
        openCheckout();
      });
    }
  }

  function updateQuantity(key, diff) {
    const cur = cart[key] || 0;
    const next = cur + diff;
    if (next <= 0) {
      delete cart[key];
    } else {
      cart[key] = Math.min(99, next);
    }
    saveCart();
    renderCart();
  }

  function addToCart(key) {
    updateQuantity(key, 1);
    openCart();
  }

  function openCart() {
    if (cartDrawer) cartDrawer.classList.add("is-open");
    if (cartBackdrop) cartBackdrop.classList.add("is-open");
    updateScrollLock();
  }

  function closeCart() {
    if (cartDrawer) cartDrawer.classList.remove("is-open");
    if (cartBackdrop) cartBackdrop.classList.remove("is-open");
    updateScrollLock();
  }

  function openCheckout() {
    const { total } = getCartSummary();
    if (checkoutTotalEl) checkoutTotalEl.textContent = formatPrice(total);
    if (checkoutErrorEl) {
      checkoutErrorEl.textContent = "";
      checkoutErrorEl.classList.remove("is-visible");
    }
    if (checkoutBackdrop) checkoutBackdrop.classList.add("is-open");
    updateScrollLock();

    const nameInput = document.getElementById("customer-name");
    if (nameInput) setTimeout(() => nameInput.focus(), 50);
  }

  function closeCheckout() {
    if (checkoutBackdrop) checkoutBackdrop.classList.remove("is-open");
    updateScrollLock();
  }

  function openMobileMenu() {
    if (mobileMenuLayer) mobileMenuLayer.classList.add("is-open");
    updateScrollLock();
  }

  function closeMobileMenu() {
    if (mobileMenuLayer) mobileMenuLayer.classList.remove("is-open");
    updateScrollLock();
  }

  // Handle WhatsApp Checkout Submit
  function handleCheckoutSubmit(e) {
    e.preventDefault();
    const { entries, total } = getCartSummary();

    if (entries.length === 0) {
      showError("Add a mix to your order before continuing.");
      return;
    }

    const nameInput = document.getElementById("customer-name");
    const phoneInput = document.getElementById("customer-phone");
    const locationInput = document.getElementById("customer-location");

    const name = nameInput ? nameInput.value.trim() : "";
    const rawPhone = phoneInput ? phoneInput.value.trim() : "";
    const location = locationInput ? locationInput.value.trim() : "";

    const phone = normalizePhone(rawPhone);
    if (name.length < 2 || !phone) {
      showError("Enter your name and a valid Ghanaian mobile number to continue.");
      return;
    }

    const orderSummary = entries
      .map(([key, qty]) => {
        const prod = PRODUCT_CATALOG[key];
        return prod ? `• ${qty} × ${prod.name} — ${formatPrice(prod.price * qty)}` : "";
      })
      .filter(Boolean)
      .join("\n");

    const messageLines = [
      "Hello Maxwellina Foods! I'd like to place an order:",
      "",
      `Name: ${name}`,
      `Phone: ${phone}`,
      ...(location ? [`Delivery location: ${location}`] : []),
      "",
      orderSummary,
      "",
      `Product total: ${formatPrice(total)}`,
      "Please confirm payment and delivery details. Thank you!"
    ];

    const message = messageLines.join("\n");
    const whatsappUrl = `https://wa.me/${WHATSAPP_ORDER_NUMBER}?text=${encodeURIComponent(message)}`;

    window.location.assign(whatsappUrl);
  }

  function showError(msg) {
    if (checkoutErrorEl) {
      checkoutErrorEl.textContent = msg;
      checkoutErrorEl.classList.add("is-visible");
    }
  }

  // Initialization & Event Binding
  document.addEventListener("DOMContentLoaded", () => {
    loadCart();
    renderCart();

    // Add to cart buttons on page
    document.querySelectorAll("[data-add-to-cart]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const productKey = btn.getAttribute("data-add-to-cart");
        addToCart(productKey);
      });
    });

    // Cart Drawer triggers
    if (cartToggleBtn) cartToggleBtn.addEventListener("click", openCart);
    if (closeCartBtn) closeCartBtn.addEventListener("click", closeCart);
    if (cartBackdrop) cartBackdrop.addEventListener("click", closeCart);

    // Checkout modal triggers
    if (closeCheckoutBtn) closeCheckoutBtn.addEventListener("click", closeCheckout);
    if (checkoutBackdrop) {
      checkoutBackdrop.addEventListener("click", (e) => {
        if (e.target === checkoutBackdrop) closeCheckout();
      });
    }
    if (checkoutForm) {
      checkoutForm.addEventListener("submit", handleCheckoutSubmit);
    }

    // Mobile Menu triggers
    if (mobileMenuToggle) mobileMenuToggle.addEventListener("click", openMobileMenu);
    if (closeMobileMenuBtn) closeMobileMenuBtn.addEventListener("click", closeMobileMenu);
    if (mobileMenuBackdrop) mobileMenuBackdrop.addEventListener("click", closeMobileMenu);
    document.querySelectorAll(".mobile-menu-panel nav a").forEach((link) => {
      link.addEventListener("click", closeMobileMenu);
    });

    // Global keyboard listener for ESC key
    window.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        closeCart();
        closeCheckout();
        closeMobileMenu();
      }
    });
  });
})();
