import crypto from "node:crypto";
import { Order, OrderStatus, PublicOrder } from "./types";
import { loadOrders, saveOrders } from "./order-store";
import {
  PRODUCT_CATALOG,
  ADMIN_STATUS_KEYS,
  cleanText,
  normalizePhone
} from "./constants";

export { PRODUCT_CATALOG, cleanText, normalizePhone };

export const PORT = Number(process.env.PORT || 3000);
export const PUBLIC_BASE_URL = (process.env.PUBLIC_BASE_URL || `http://localhost:${PORT}`).replace(/\/+$/, "");
export const ADMIN_TOKEN = process.env.ADMIN_TOKEN || "";
export const HUBTEL_CLIENT_ID = process.env.HUBTEL_CLIENT_ID || "";
export const HUBTEL_CLIENT_SECRET = process.env.HUBTEL_CLIENT_SECRET || "";
export const HUBTEL_MERCHANT_ACCOUNT_NUMBER = process.env.HUBTEL_MERCHANT_ACCOUNT_NUMBER || "";
export const HUBTEL_CONFIGURED = Boolean(HUBTEL_CLIENT_ID && HUBTEL_CLIENT_SECRET && HUBTEL_MERCHANT_ACCOUNT_NUMBER);

export const ADMIN_STATUSES = new Set<OrderStatus>(ADMIN_STATUS_KEYS);

export function publicOrder(order: Order): PublicOrder {
  return {
    reference: order.reference,
    status: order.status,
    total: order.total,
    items: order.items.map((item) => ({ name: item.name, quantity: item.quantity })),
    createdAt: order.createdAt,
    updatedAt: order.updatedAt
  };
}

export function statusFromHubtel(payload: any): "paid" | "payment_failed" | null {
  const data = payload?.data || payload?.Data || payload;
  const status = String(data?.status || data?.Status || "").toLowerCase();
  if (["success", "successful", "paid", "completed"].includes(status)) return "paid";
  if (["failed", "failure", "cancelled", "canceled"].includes(status)) return "payment_failed";
  return null;
}

export function findClientReference(payload: any): string {
  const entries = [payload, payload?.data, payload?.Data, payload?.response, payload?.Response];
  for (const entry of entries) {
    const value = entry?.clientReference || entry?.ClientReference;
    if (typeof value === "string") return value;
  }
  return "";
}

export async function updatePaymentStatus(reference: string): Promise<void> {
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

export async function createCheckout(order: Order): Promise<string> {
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

export function verifyAdminToken(authHeader?: string | null): boolean {
  if (!ADMIN_TOKEN) return false;
  const supplied = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : "";
  const expectedBuffer = Buffer.from(ADMIN_TOKEN);
  const suppliedBuffer = Buffer.from(supplied);
  if (expectedBuffer.length !== suppliedBuffer.length) return false;
  return crypto.timingSafeEqual(expectedBuffer, suppliedBuffer);
}
