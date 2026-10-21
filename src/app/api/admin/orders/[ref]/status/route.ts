import { NextResponse } from "next/server";
import { ADMIN_STATUSES, ADMIN_TOKEN, verifyAdminToken } from "@/lib/hubtel";
import { loadOrders, saveOrders } from "@/lib/order-store";
import { OrderStatus } from "@/lib/types";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ ref: string }> }
) {
  if (!ADMIN_TOKEN) {
    return NextResponse.json({ error: "Owner order management is not configured." }, { status: 503 });
  }

  const authHeader = request.headers.get("authorization");
  if (!verifyAdminToken(authHeader)) {
    return NextResponse.json({ error: "Sign in with the owner access token." }, { status: 401 });
  }

  const { ref } = await context.params;
  const reference = decodeURIComponent(ref);

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  const status = body?.status as OrderStatus;
  if (!ADMIN_STATUSES.has(status)) {
    return NextResponse.json({ error: "Choose a valid fulfillment status." }, { status: 400 });
  }

  const orders = await loadOrders();
  const order = orders.find((entry) => entry.reference === reference);
  if (!order) {
    return NextResponse.json({ error: "Order not found." }, { status: 404 });
  }

  if (order.status === "awaiting_payment" || order.status === "payment_failed") {
    return NextResponse.json({ error: "Confirm payment before updating fulfillment." }, { status: 409 });
  }

  order.status = status;
  order.updatedAt = new Date().toISOString();
  await saveOrders(orders);

  return NextResponse.json({ order });
}
