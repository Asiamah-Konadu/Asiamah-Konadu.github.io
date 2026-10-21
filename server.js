"use strict";

const crypto = require("node:crypto");
const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");
const { loadOrders, saveOrders } = require("./order-store");

const ROOT = __dirname;
const PORT = Number(process.env.PORT || 3000);
const PUBLIC_BASE_URL = (process.env.PUBLIC_BASE_URL || `http://localhost:${PORT}`).replace(/\/+$/, "");
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || "";
const HUBTEL_CLIENT_ID = process.env.HUBTEL_CLIENT_ID || "";
const HUBTEL_CLIENT_SECRET = process.env.HUBTEL_CLIENT_SECRET || "";
const HUBTEL_MERCHANT_ACCOUNT_NUMBER = process.env.HUBTEL_MERCHANT_ACCOUNT_NUMBER || "";
const HUBTEL_CONFIGURED = Boolean(HUBTEL_CLIENT_ID && HUBTEL_CLIENT_SECRET && HUBTEL_MERCHANT_ACCOUNT_NUMBER);
const PRODUCT_CATALOG = Object.freeze({
  bofrot: { name: "Bofrot Mix", price: 35 },
  pancake: { name: "Pancake Mix", price: 35 }
});
const ADMIN_STATUSES = new Set(["preparing", "ready", "dispatched", "delivered", "cancelled"]);
const PUBLIC_FILES = new Set([
  "/index.html",
  "/admin.html",
  "/styles.css",
  "/admin.css",
  "/app.js",
  "/admin.js",
  "/logo.svg",
  "/IMG-20261020-WA0015.jpg",
  "/IMG-20261020-WA0016.jpg",
  "/IMG-20261020-WA0017.jpg",
  "/file_00000000407881f5a22c99385e36519a.png",
  "/file_00000000230881f4b29e4d285a91ba27.png"
]);
const MIME_TYPES = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml"
};

function sendJson(response, status, data) {
  response.writeHead(status, {
    "Cache-Control": "no-store",
    "Content-Type": "application/json; charset=utf-8"
  });
  response.end(JSON.stringify(data));
}

function readJson(request) {
  return new Promise((resolve, reject) => {
    if (request.body !== undefined) {
      try {
        const body = Buffer.isBuffer(request.body) ? request.body.toString("utf8") : request.body;
        if (typeof body === "string") {
          if (Buffer.byteLength(body) > 16_384) {
            return reject(Object.assign(new Error("Request body is too large."), { statusCode: 413 }));
          }
          return resolve(JSON.parse(body || "{}"));
        }
        if (body && typeof body === "object" && Buffer.byteLength(JSON.stringify(body)) > 16_384) {
          return reject(Object.assign(new Error("Request body is too large."), { statusCode: 413 }));
        }
        return resolve(body && typeof body === "object" ? body : {});
      } catch {
        return reject(Object.assign(new Error("Request body must be valid JSON."), { statusCode: 400 }));
      }
    }

    let body = "";
    request.on("data", (chunk) => {
      body += chunk;
      if (Buffer.byteLength(body) > 16_384) {
        reject(Object.assign(new Error("Request body is too large."), { statusCode: 413 }));
        request.destroy();
      }
    });
    request.on("end", () => {
      try {
        resolve(JSON.parse(body || "{}"));
      } catch {
        reject(Object.assign(new Error("Request body must be valid JSON."), { statusCode: 400 }));
      }
    });
    request.on("error", reject);
  });
}

function cleanText(value, maxLength) {
  return typeof value === "string" ? value.trim().replace(/\s+/g, " ").slice(0, maxLength) : "";
}

function normalizePhone(value) {
  let digits = String(value || "").replace(/[^\d+]/g, "");
  if (digits.startsWith("00")) digits = `+${digits.slice(2)}`;
  if (digits.startsWith("0")) digits = `+233${digits.slice(1)}`;
  else if (digits.startsWith("233")) digits = `+${digits}`;
  return /^\+233[235]\d{8}$/.test(digits) ? digits : "";
}

function publicOrder(order) {
  return {
    reference: order.reference,
    status: order.status,
    total: order.total,
    items: order.items.map((item) => ({ name: item.name, quantity: item.quantity })),
    createdAt: order.createdAt,
    updatedAt: order.updatedAt
  };
}

function statusFromHubtel(payload) {
  const data = payload?.data || payload?.Data || payload;
  const status = String(data?.status || data?.Status || "").toLowerCase();
  if (["success", "successful", "paid", "completed"].includes(status)) return "paid";
  if (["failed", "failure", "cancelled", "canceled"].includes(status)) return "payment_failed";
  return null;
}

function findClientReference(payload) {
  const entries = [payload, payload?.data, payload?.Data, payload?.response, payload?.Response];
  for (const entry of entries) {
    const value = entry?.clientReference || entry?.ClientReference;
    if (typeof value === "string") return value;
  }
  return "";
}

async function updatePaymentStatus(reference) {
  if (!HUBTEL_CONFIGURED) return;
  const orders = await loadOrders();
  const order = orders.find((entry) => entry.reference === reference);
  if (!order || order.status !== "awaiting_payment") return;
  const url = new URL(`https://api-txnstatus.hubtel.com/transactions/${encodeURIComponent(HUBTEL_MERCHANT_ACCOUNT_NUMBER)}/status`);
  url.searchParams.set("clientReference", order.reference);
  const authorization = Buffer.from(`${HUBTEL_CLIENT_ID}:${HUBTEL_CLIENT_SECRET}`).toString("base64");
  const response = await fetch(url, {
    headers: { Authorization: `Basic ${authorization}`, Accept: "application/json" },
    signal: AbortSignal.timeout(12_000)
  });
  if (!response.ok) throw new Error(`Hubtel transaction status returned HTTP ${response.status}.`);
  const result = statusFromHubtel(await response.json());
  if (result) {
    order.paymentStatus = result;
    order.status = result === "paid" ? "paid" : "payment_failed";
    order.updatedAt = new Date().toISOString();
    await saveOrders(orders);
  }
}

async function createCheckout(order) {
  const authorization = Buffer.from(`${HUBTEL_CLIENT_ID}:${HUBTEL_CLIENT_SECRET}`).toString("base64");
  const response = await fetch("https://payproxyapi.hubtel.com/items/initiate", {
    method: "POST",
    headers: {
      Authorization: `Basic ${authorization}`,
      "Content-Type": "application/json",
      Accept: "application/json"
    },
    body: JSON.stringify({
      totalAmount: order.total,
      description: order.items.map((item) => `${item.quantity} × ${item.name}`).join(", "),
      callbackUrl: `${PUBLIC_BASE_URL}/api/hubtel/callback`,
      returnUrl: `${PUBLIC_BASE_URL}/?order=${encodeURIComponent(order.reference)}#track`,
      cancellationUrl: `${PUBLIC_BASE_URL}/?cancelled=${encodeURIComponent(order.reference)}#track`,
      merchantAccountNumber: HUBTEL_MERCHANT_ACCOUNT_NUMBER,
      clientReference: order.reference,
      customerPhoneNumber: order.phone
    }),
    signal: AbortSignal.timeout(15_000)
  });
  const result = await response.json().catch(() => ({}));
  const data = result?.data || result?.Data || result;
  const checkoutUrl = data?.checkoutUrl || data?.CheckoutUrl || data?.checkout_url;
  let checkoutHost = "";
  try {
    checkoutHost = new URL(checkoutUrl).hostname;
  } catch {
    checkoutHost = "";
  }
  if (!response.ok || !checkoutHost.endsWith(".hubtel.com")) {
    throw new Error(`Hubtel checkout could not be started (HTTP ${response.status}).`);
  }
  return checkoutUrl;
}

function requireAdmin(request, response) {
  if (!ADMIN_TOKEN) {
    sendJson(response, 503, { error: "Owner order management is not configured." });
    return false;
  }
  const authorization = request.headers.authorization || "";
  const supplied = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
  const expectedBuffer = Buffer.from(ADMIN_TOKEN);
  const suppliedBuffer = Buffer.from(supplied);
  if (expectedBuffer.length !== suppliedBuffer.length || !crypto.timingSafeEqual(expectedBuffer, suppliedBuffer)) {
    sendJson(response, 401, { error: "Sign in with the owner access token." });
    return false;
  }
  return true;
}

async function handleApi(request, response, url) {
  if (request.method === "GET" && url.pathname === "/api/health") {
    return sendJson(response, 200, { ok: true, hubtelConfigured: HUBTEL_CONFIGURED });
  }

  if (request.method === "POST" && url.pathname === "/api/checkout") {
    if (!HUBTEL_CONFIGURED) return sendJson(response, 503, { error: "Secure checkout is not set up yet. Please contact Maxwellina Foods to place your order." });
    let body;
    try {
      body = await readJson(request);
    } catch (error) {
      return sendJson(response, error.statusCode || 400, { error: error.message });
    }
    const name = cleanText(body.name, 80);
    const phone = normalizePhone(body.phone);
    const location = cleanText(body.location, 240);
    if (name.length < 2 || !phone || !Array.isArray(body.items) || body.items.length < 1 || body.items.length > 2) {
      return sendJson(response, 400, { error: "Enter your name, a valid Ghanaian mobile number and at least one available mix." });
    }
    const items = [];
    const seen = new Set();
    for (const entry of body.items) {
      if (!entry || !Object.hasOwn(PRODUCT_CATALOG, entry.product) || !Number.isInteger(entry.quantity) || entry.quantity < 1 || entry.quantity > 99 || seen.has(entry.product)) {
        return sendJson(response, 400, { error: "Your order contains an invalid product or quantity. Please review your basket." });
      }
      seen.add(entry.product);
      items.push({ product: entry.product, name: PRODUCT_CATALOG[entry.product].name, quantity: entry.quantity, unitPrice: PRODUCT_CATALOG[entry.product].price });
    }
    const total = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
    const orders = await loadOrders();
    const reference = `MW-${crypto.randomBytes(6).toString("hex").toUpperCase()}`;
    const order = {
      reference,
      name,
      phone,
      location,
      items,
      total,
      currency: "GHS",
      status: "awaiting_payment",
      paymentStatus: "pending",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    orders.push(order);
    await saveOrders(orders);
    try {
      const checkoutUrl = await createCheckout(order);
      return sendJson(response, 201, { reference, checkoutUrl });
    } catch (error) {
      const latestOrders = await loadOrders();
      const failedOrder = latestOrders.find((entry) => entry.reference === reference);
      if (failedOrder) {
        failedOrder.status = "payment_failed";
        failedOrder.paymentStatus = "checkout_error";
        failedOrder.updatedAt = new Date().toISOString();
        await saveOrders(latestOrders);
      }
      console.error("Hubtel checkout initiation failed:", error.message);
      return sendJson(response, 502, { error: "We couldn't connect to Hubtel. Your payment has not been taken; please try again shortly." });
    }
  }

  if (request.method === "GET" && url.pathname.startsWith("/api/orders/")) {
    const reference = decodeURIComponent(url.pathname.slice("/api/orders/".length)).toUpperCase();
    const phone = normalizePhone(url.searchParams.get("phone"));
    if (!phone) return sendJson(response, 400, { error: "Enter a valid Ghanaian phone number." });
    const orders = await loadOrders();
    const order = orders.find((entry) => entry.reference === reference && entry.phone === phone);
    if (!order) return sendJson(response, 404, { error: "We couldn't find an order with those details. Check your order code and phone number." });
    if (order.status === "awaiting_payment" && HUBTEL_CONFIGURED) {
      try {
        await updatePaymentStatus(reference);
      } catch (error) {
        console.error("Hubtel payment verification failed:", error.message);
        return sendJson(response, 502, { error: "We couldn't refresh the payment status right now. Please try again shortly." });
      }
    }
    const current = (await loadOrders()).find((entry) => entry.reference === reference);
    return sendJson(response, 200, publicOrder(current || order));
  }

  if (request.method === "POST" && url.pathname === "/api/hubtel/callback") {
    let body;
    try {
      body = await readJson(request);
    } catch (error) {
      return sendJson(response, error.statusCode || 400, { error: error.message });
    }
    const reference = findClientReference(body);
    if (!reference || !HUBTEL_CONFIGURED) return sendJson(response, 400, { error: "Payment callback could not be verified." });
    try {
      await updatePaymentStatus(reference);
      return sendJson(response, 200, { received: true });
    } catch (error) {
      console.error("Hubtel callback verification failed:", error.message);
      return sendJson(response, 502, { error: "Payment status verification is temporarily unavailable." });
    }
  }

  if (url.pathname.startsWith("/api/admin/")) {
    if (!requireAdmin(request, response)) return;
    if (request.method === "GET" && url.pathname === "/api/admin/orders") {
      const orders = (await loadOrders()).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      return sendJson(response, 200, { orders });
    }
    const match = url.pathname.match(/^\/api\/admin\/orders\/([^/]+)\/status$/);
    if (request.method === "PATCH" && match) {
      let body;
      try {
        body = await readJson(request);
      } catch (error) {
        return sendJson(response, error.statusCode || 400, { error: error.message });
      }
      const status = body.status;
      if (!ADMIN_STATUSES.has(status)) return sendJson(response, 400, { error: "Choose a valid fulfillment status." });
      const orders = await loadOrders();
      const order = orders.find((entry) => entry.reference === decodeURIComponent(match[1]));
      if (!order) return sendJson(response, 404, { error: "Order not found." });
      if (order.status === "awaiting_payment" || order.status === "payment_failed") {
        return sendJson(response, 409, { error: "Confirm payment before updating fulfillment." });
      }
      order.status = status;
      order.updatedAt = new Date().toISOString();
      await saveOrders(orders);
      return sendJson(response, 200, { order });
    }
  }
  return sendJson(response, 404, { error: "Not found." });
}

function serveStatic(request, response, url) {
  if (!["GET", "HEAD"].includes(request.method)) {
    response.writeHead(405, { Allow: "GET, HEAD" });
    return response.end("Method not allowed");
  }
  let pathname;
  try {
    pathname = decodeURIComponent(url.pathname);
  } catch {
    response.writeHead(400);
    return response.end("Bad request");
  }
  if (pathname === "/") pathname = "/index.html";
  if (!PUBLIC_FILES.has(pathname)) {
    response.writeHead(404);
    return response.end("Not found");
  }
  const filePath = path.resolve(ROOT, `.${pathname}`);
  if (!filePath.startsWith(`${ROOT}${path.sep}`)) {
    response.writeHead(403);
    return response.end("Forbidden");
  }
  let stat;
  try {
    stat = fs.statSync(filePath);
  } catch {
    response.writeHead(404);
    return response.end("Not found");
  }
  if (!stat.isFile()) {
    response.writeHead(404);
    return response.end("Not found");
  }
  response.writeHead(200, {
    "Cache-Control": filePath.endsWith(".html") ? "no-cache" : "public, max-age=3600",
    "Content-Length": stat.size,
    "Content-Type": MIME_TYPES[path.extname(filePath).toLowerCase()] || "application/octet-stream"
  });
  if (request.method === "HEAD") return response.end();
  fs.createReadStream(filePath).pipe(response);
}

async function handleRequest(request, response) {
  response.setHeader("X-Content-Type-Options", "nosniff");
  response.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  response.setHeader("X-Frame-Options", "DENY");
  response.setHeader("Content-Security-Policy", "default-src 'self'; img-src 'self' data:; style-src 'self' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; script-src 'self'; connect-src 'self'; base-uri 'self'; form-action 'self' https://pay.hubtel.com https://*.hubtel.com; frame-ancestors 'none'");
  const url = new URL(request.url, `http://${request.headers.host || "localhost"}`);
  try {
    if (url.pathname.startsWith("/api/")) {
      const origin = request.headers.origin;
      if (origin) {
        const allowedOrigins = (process.env.FRONTEND_ORIGINS || "")
          .split(",")
          .map((entry) => entry.trim())
          .filter(Boolean);
        if (!allowedOrigins.includes(origin)) {
          return sendJson(response, 403, { error: "This website is not allowed to use the API." });
        }
        response.setHeader("Access-Control-Allow-Origin", origin);
        response.setHeader("Access-Control-Allow-Methods", "GET, POST, PATCH, OPTIONS");
        response.setHeader("Access-Control-Allow-Headers", "Authorization, Content-Type");
        response.setHeader("Vary", "Origin");
        if (request.method === "OPTIONS") {
          response.writeHead(204);
          return response.end();
        }
      }
      if (process.env.VERCEL && !process.env.DATABASE_URL) {
        return sendJson(response, 503, { error: "Order storage is not configured. Set DATABASE_URL to a Neon Postgres connection string." });
      }
      await handleApi(request, response, url);
    } else {
      serveStatic(request, response, url);
    }
  } catch (error) {
    console.error("Request failed:", error.message);
    if (!response.headersSent) sendJson(response, 500, { error: "Something went wrong. Please try again." });
    else response.destroy();
  }
}

if (require.main === module) {
  const server = http.createServer(handleRequest);
  server.listen(PORT, () => {
    console.log(`Maxwellina Foods is listening on port ${PORT}.`);
    if (!HUBTEL_CONFIGURED) console.warn("Hubtel checkout is disabled until merchant credentials are configured.");
    if (!ADMIN_TOKEN) console.warn("Owner order management is disabled until ADMIN_TOKEN is configured.");
  });
}

module.exports = handleRequest;
