import { NextResponse } from "next/server";
import {
  HUBTEL_CONFIGURED,
  normalizePhone,
  publicOrder,
  updatePaymentStatus
} from "@/lib/hubtel";
import { loadOrders } from "@/lib/order-store";

export async function GET(
  request: Request,
  context: { params: Promise<{ ref: string }> }
) {
  const { ref } = await context.params;
  const reference = decodeURIComponent(ref).toUpperCase();
  const url = new URL(request.url);
  const phone = normalizePhone(url.searchParams.get("phone"));

  if (!phone) {
    return NextResponse.json(
      { error: "Enter a valid Ghanaian phone number." },
      { status: 400 }
    );
  }

  const orders = await loadOrders();
  const order = orders.find((entry) => entry.reference === reference && entry.phone === phone);

  if (!order) {
    return NextResponse.json(
      { error: "We couldn't find an order with those details. Check your order code and phone number." },
      { status: 404 }
    );
  }

  if (order.status === "awaiting_payment" && HUBTEL_CONFIGURED) {
    try {
      await updatePaymentStatus(reference);
    } catch (error: any) {
      console.error("Hubtel payment verification failed:", error?.message || error);
      return NextResponse.json(
        { error: "We couldn't refresh the payment status right now. Please try again shortly." },
        { status: 502 }
      );
    }
  }

  const refreshedOrders = await loadOrders();
  const current = refreshedOrders.find((entry) => entry.reference === reference);
  return NextResponse.json(publicOrder(current || order));
}
