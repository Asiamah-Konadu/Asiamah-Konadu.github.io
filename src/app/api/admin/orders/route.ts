import { NextResponse } from "next/server";
import { ADMIN_TOKEN, verifyAdminToken } from "@/lib/hubtel";
import { loadOrders } from "@/lib/order-store";

export async function GET(request: Request) {
  if (!ADMIN_TOKEN) {
    return NextResponse.json({ error: "Owner order management is not configured." }, { status: 503 });
  }

  const authHeader = request.headers.get("authorization");
  if (!verifyAdminToken(authHeader)) {
    return NextResponse.json({ error: "Sign in with the owner access token." }, { status: 401 });
  }

  const orders = await loadOrders();
  const sorted = [...orders].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return NextResponse.json({ orders: sorted });
}
