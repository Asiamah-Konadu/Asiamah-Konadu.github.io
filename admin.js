const statuses = [
  ["preparing", "Being prepared"],
  ["ready", "Ready for collection"],
  ["dispatched", "On its way"],
  ["delivered", "Delivered"],
  ["cancelled", "Cancelled"]
];
const formatPrice = (amount) => "GH₵" + Number(amount).toFixed(2).replace(/\.00$/, "");
let accessToken = "";

function authHeaders(extra = {}) {
  return {
    ...extra,
    Authorization: "Bearer " + accessToken
  };
}

document.querySelector("#current-year").textContent = new Date().getFullYear();

async function loadOrders() {
  const message = document.querySelector("#orders-message");
  const list = document.querySelector("#order-list");
  message.textContent = "Loading orders…";
  try {
    const response = await fetch("/api/admin/orders", { headers: authHeaders() });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Unable to load orders.");
    message.textContent = "";
    list.replaceChildren();
    if (!data.orders.length) {
      const empty = document.createElement("p");
      empty.className = "empty-orders";
      empty.textContent = "No orders yet. New customer orders will appear here.";
      list.append(empty);
      return;
    }
    data.orders.forEach((order) => list.append(createOrderCard(order)));
  } catch (error) {
    message.textContent = error.message;
    if (error.message.includes("Sign in")) {
      document.querySelector("#admin-orders").hidden = true;
      document.querySelector("#admin-login").hidden = false;
    }
  }
}

function createOrderCard(order) {
  const card = document.createElement("article");
  card.className = "order-card";
  const header = document.createElement("div");
  header.className = "order-card-header";
  const heading = document.createElement("div");
  const title = document.createElement("h3");
  title.textContent = order.reference;
  const timestamp = document.createElement("p");
  timestamp.textContent = new Date(order.createdAt).toLocaleString();
  heading.append(title, timestamp);
  const total = document.createElement("p");
  total.className = "order-total";
  total.textContent = formatPrice(order.total);
  header.append(heading, total);

  const details = document.createElement("div");
  details.className = "order-card-details";
  const contact = document.createElement("p");
  contact.textContent = order.name + " · " + order.phone;
  const items = document.createElement("p");
  items.textContent = order.items.map((item) => item.quantity + " × " + item.name).join(", ");
  details.append(contact, items);
  if (order.location) {
    const location = document.createElement("p");
    location.textContent = "Location: " + order.location;
    details.append(location);
  }

  const current = document.createElement("div");
  current.className = "status-row";
  const paymentText = document.createElement("span");
  paymentText.className = "status-pill";
  paymentText.textContent = order.paymentStatus + " · " + order.status.replaceAll("_", " ");
  current.append(paymentText);
  if (!["awaiting_payment", "payment_failed"].includes(order.status)) {
    const label = document.createElement("label");
    label.textContent = "Update order status";
    label.htmlFor = "status-" + order.reference;
    const select = document.createElement("select");
    select.id = "status-" + order.reference;
    select.setAttribute("aria-label", "Update status for " + order.reference);
    const currentOption = document.createElement("option");
    currentOption.value = order.status;
    currentOption.textContent = order.status.replaceAll("_", " ");
    select.append(currentOption);
    statuses.filter(([value]) => value !== order.status).forEach(([value, name]) => {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = name;
      select.append(option);
    });
    select.addEventListener("change", async () => {
      select.disabled = true;
      try {
        const response = await fetch("/api/admin/orders/" + encodeURIComponent(order.reference) + "/status", {
          method: "PATCH",
          headers: authHeaders({ "Content-Type": "application/json" }),
          body: JSON.stringify({ status: select.value })
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Unable to update status.");
        await loadOrders();
      } catch (error) {
        document.querySelector("#orders-message").textContent = error.message;
        select.disabled = false;
      }
    });
    current.append(label, select);
  }
  card.append(header, details, current);
  return card;
}

document.querySelector("#admin-login-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  accessToken = document.querySelector("#admin-token").value;
  const message = document.querySelector("#admin-login-message");
  message.textContent = "Checking access…";
  try {
    const response = await fetch("/api/admin/orders", { headers: authHeaders() });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Unable to sign in.");
    document.querySelector("#admin-login").hidden = true;
    document.querySelector("#admin-orders").hidden = false;
    message.textContent = "";
    renderOrders(data.orders);
  } catch (error) {
    message.textContent = error.message;
    accessToken = "";
  }
});

function renderOrders(orders) {
  const list = document.querySelector("#order-list");
  list.replaceChildren();
  if (!orders.length) {
    const empty = document.createElement("p");
    empty.className = "empty-orders";
    empty.textContent = "No orders yet. New customer orders will appear here.";
    list.append(empty);
    return;
  }
  orders.forEach((order) => list.append(createOrderCard(order)));
}

document.querySelector("#refresh-orders").addEventListener("click", loadOrders);
document.querySelector("#admin-logout").addEventListener("click", () => {
  accessToken = "";
  document.querySelector("#admin-token").value = "";
  document.querySelector("#admin-orders").hidden = true;
  document.querySelector("#admin-login").hidden = false;
});
