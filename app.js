const products = {
  bofrot: { name: "Bofrot Mix", price: 35 },
  pancake: { name: "Pancake Mix", price: 35 }
};

const cart = new Map();
const drawer = document.querySelector("#cart-drawer");
const backdrop = document.querySelector("#cart-backdrop");
const checkoutDialog = document.querySelector("#checkout-dialog");
const toast = document.querySelector("#toast");
let toastTimer;

document.querySelector("#current-year").textContent = new Date().getFullYear();

function formatPrice(amount) {
  return `GH₵${amount.toFixed(2).replace(/\.00$/, "")}`;
}

function renderCart() {
  const items = document.querySelector("#cart-items");
  const empty = document.querySelector("#empty-cart");
  const summary = document.querySelector("#cart-summary");
  const entries = [...cart.entries()];
  const itemCount = entries.reduce((sum, [, quantity]) => sum + quantity, 0);
  const total = entries.reduce((sum, [key, quantity]) => sum + products[key].price * quantity, 0);
  items.replaceChildren();
  for (const [key, quantity] of entries) {
    const item = document.createElement("div");
    item.className = "cart-item";
    const details = document.createElement("div");
    const title = document.createElement("p");
    title.className = "cart-item-title";
    title.textContent = products[key].name;
    const price = document.createElement("span");
    price.className = "cart-item-price";
    price.textContent = `${formatPrice(products[key].price)} each`;
    details.append(title, price);

    const controls = document.createElement("div");
    controls.className = "quantity-controls";
    const decrease = document.createElement("button");
    decrease.type = "button";
    decrease.textContent = "−";
    decrease.setAttribute("aria-label", `Remove one ${products[key].name}`);
    decrease.addEventListener("click", () => updateQuantity(key, -1));
    const count = document.createElement("span");
    count.textContent = quantity;
    const increase = document.createElement("button");
    increase.type = "button";
    increase.textContent = "+";
    increase.setAttribute("aria-label", `Add one ${products[key].name}`);
    increase.addEventListener("click", () => updateQuantity(key, 1));
    controls.append(decrease, count, increase);
    item.append(details, controls);
    items.append(item);
  }
  empty.hidden = entries.length > 0;
  summary.hidden = entries.length === 0;
  document.querySelector("#cart-total").textContent = formatPrice(total);
  document.querySelector("#checkout-total").textContent = formatPrice(total);
  document.querySelector("#cart-count").textContent = itemCount;
  document.querySelector("#cart-open").setAttribute("aria-label", `Open your order, ${itemCount} ${itemCount === 1 ? "item" : "items"}`);
}

function updateQuantity(key, difference) {
  const next = (cart.get(key) || 0) + difference;
  if (next > 0 && next <= 99) cart.set(key, next);
  else if (next <= 0) cart.delete(key);
  renderCart();
}

function openCart() {
  backdrop.hidden = false;
  drawer.classList.add("is-open");
  drawer.setAttribute("aria-hidden", "false");
  document.querySelector("#cart-open").setAttribute("aria-expanded", "true");
  document.body.style.overflow = "hidden";
  document.querySelector("#close-cart").focus();
}

function closeCart() {
  drawer.classList.remove("is-open");
  drawer.setAttribute("aria-hidden", "true");
  backdrop.hidden = true;
  document.querySelector("#cart-open").setAttribute("aria-expanded", "false");
  document.body.style.overflow = "";
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("is-visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("is-visible"), 2600);
}

document.querySelectorAll("[data-add]").forEach((button) => {
  button.addEventListener("click", () => {
    updateQuantity(button.dataset.add, 1);
    openCart();
  });
});

document.querySelector("#close-cart").addEventListener("click", closeCart);
document.querySelector("#cart-open").addEventListener("click", openCart);
backdrop.addEventListener("click", closeCart);
document.querySelector("#browse-products").addEventListener("click", closeCart);
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && drawer.classList.contains("is-open")) closeCart();
});
document.querySelector("#checkout-button").addEventListener("click", () => {
  closeCart();
  document.querySelector("#checkout-error").textContent = "";
  checkoutDialog.showModal();
  document.querySelector("#customer-name").focus();
});
document.querySelector("#close-dialog").addEventListener("click", () => checkoutDialog.close());
checkoutDialog.addEventListener("click", (event) => {
  if (event.target === checkoutDialog) checkoutDialog.close();
});

document.querySelector("#checkout-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const submit = document.querySelector("#checkout-submit");
  const error = document.querySelector("#checkout-error");
  const fields = new FormData(event.currentTarget);
  const orderItems = [...cart.entries()].map(([product, quantity]) => ({ product, quantity }));
  if (orderItems.length === 0) {
    error.textContent = "Add a mix to your order before continuing.";
    return;
  }
  submit.disabled = true;
  submit.textContent = "Connecting to secure checkout…";
  error.textContent = "";
  try {
    const response = await fetch("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: fields.get("name"),
        phone: fields.get("phone"),
        location: fields.get("location"),
        items: orderItems
      })
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "We couldn't start your checkout. Please try again.");
    sessionStorage.setItem("maxwellina-last-order", result.reference);
    window.location.assign(result.checkoutUrl);
  } catch (checkoutError) {
    error.textContent = checkoutError.message;
    submit.disabled = false;
    submit.innerHTML = 'Continue to secure payment <span aria-hidden="true">↗</span>';
  }
});

const statusLabels = {
  awaiting_payment: "Waiting for payment",
  payment_failed: "Payment needs attention",
  paid: "Payment confirmed",
  preparing: "Being prepared",
  ready: "Ready for collection",
  dispatched: "On its way",
  delivered: "Delivered",
  cancelled: "Cancelled"
};

document.querySelector("#tracking-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const message = document.querySelector("#tracking-message");
  const resultBox = document.querySelector("#tracking-result");
  const fields = new FormData(form);
  const reference = String(fields.get("reference")).trim().toUpperCase();
  message.textContent = "Looking up your order…";
  resultBox.hidden = true;
  try {
    const response = await fetch(`/api/orders/${encodeURIComponent(reference)}?phone=${encodeURIComponent(fields.get("phone"))}`);
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "We couldn't find an order with those details.");
    const heading = document.createElement("strong");
    heading.textContent = statusLabels[result.status] || "Order update";
    const summary = document.createElement("p");
    summary.textContent = `${result.reference} · ${result.items.map((item) => `${item.quantity} × ${item.name}`).join(", ")} · ${formatPrice(result.total)}${result.status === "awaiting_payment" ? " — complete your payment to confirm the order." : ""}`;
    resultBox.replaceChildren(heading, summary);
    resultBox.hidden = false;
    message.textContent = "";
  } catch (trackingError) {
    message.textContent = trackingError.message;
  }
});

const query = new URLSearchParams(window.location.search);
const returnedReference = query.get("order") || sessionStorage.getItem("maxwellina-last-order");
if (query.has("order") || query.has("cancelled")) {
  const reference = query.get("order") || query.get("cancelled");
  document.querySelector("#tracking-reference").value = reference;
  document.querySelector("#track").scrollIntoView({ behavior: "smooth" });
  if (query.has("cancelled")) showToast("Your order is saved. You can return to checkout whenever you're ready.");
  else showToast(`Order ${reference} is ready to track. Enter your phone number to check its status.`);
  sessionStorage.removeItem("maxwellina-last-order");
  window.history.replaceState({}, "", "/#track");
} else if (returnedReference) {
  document.querySelector("#tracking-reference").value = returnedReference;
}

renderCart();
