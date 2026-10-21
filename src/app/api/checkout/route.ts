import { NextResponse } from "next/server";
import crypto from "node:crypto";
import {
  HUBTEL_CONFIGURED,
  PRODUCT_CATALOG,
  cleanText,
  normalizePhone,
  createCheckout
} from "@/lib/hubtel";
import { loadOrders, saveOrders } from "@/lib/order-store";
import { Order, OrderItem } from "@/lib/types";

export async function POST(request: Request) {
  if (!HUBTEL_CONFIGURED) {
    return NextResponse.json(
      { error: "Secure checkout is not set up yet. Please contact Maxwellina Foods to place your order." },
      { status: 503 }
    );
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  const name = cleanText(body?.name, 80);
  const phone = normalizePhone(body?.phone);
  const location = cleanText(body?.location, 240);

  if (name.length < 2 || !phone || !Array.isArray(body?.items) || body.items.length < 1 || body.items.length > 2) {
    return NextResponse.json(
      { error: "Enter your name, a valid Ghanaian mobile number and at least one available mix." },
      { status: 400 }
    );
  }

  const items: OrderItem[] = [];
  const seen = new Set<string>();

  for (const entry of body.items) {
    if (
      !entry ||
      !Object.hasOwn(PRODUCT_CATALOG, entry.product) ||
      !Number.isInteger(entry.quantity) ||
      entry.quantity < 1 ||
      entry.quantity > 99 ||
      seen.has(entry.product)
    ) {
      return NextResponse.json(
        { error: "Your order contains an invalid product or quantity. Please review your basket." },
        { status: 400 }
      );
    }
    seen.add(entry.product);
    items.push({
      product: entry.product,
      name: PRODUCT_CATALOG[entry.product].name,
      quantity: entry.quantity,
      unitPrice: PRODUCT_CATALOG[entry.product].price
    });
  }

  const total = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const orders = await loadOrders();
  const reference = `MW-${crypto.randomBytes(6).toString("hex").toUpperCase()}`;
  const now = new Date().toISOString();

  const order: Order = {
    reference,
    name,
    phone,
    location,
    items,
    total,
    currency: "GHS",
    status: "awaiting_payment",
    paymentStatus: "pending",
    createdAt: now,
    updatedAt: now
  };

  orders.push(order);
  await saveOrders(orders);

  try {
    const checkoutUrl = await createCheckout(order);
    return NextResponse.json({ reference, checkoutUrl }, { status: 201 });
  } catch (error: any) {
    const latestOrders = await loadOrders();
    const failedOrder = latestOrders.find((entry) => entry.reference === reference);
    if (failedOrder) {
      failedOrder.status = "payment_failed";
      failedOrder.paymentStatus = "checkout_error";
      failedOrder.updatedAt = new Date().toISOString();
      await saveOrders(latestOrders);
    }
    console.error("Hubtel checkout initiation failed:", error?.message || error);
    return NextResponse.json(
      { error: "We couldn't connect to Hubtel. Your payment has not been taken; please try again shortly." },
      { status: 502 }
    );
  }
}
