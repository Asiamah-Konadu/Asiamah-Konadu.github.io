import { NextResponse } from "next/server";
import {
  HUBTEL_CONFIGURED,
  findClientReference,
  updatePaymentStatus
} from "@/lib/hubtel";

export async function POST(request: Request) {
  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  const reference = findClientReference(body);
  if (!reference || !HUBTEL_CONFIGURED) {
    return NextResponse.json({ error: "Payment callback could not be verified." }, { status: 400 });
  }

  try {
    await updatePaymentStatus(reference);
    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error: any) {
    console.error("Hubtel callback verification failed:", error?.message || error);
    return NextResponse.json(
      { error: "Payment status verification is temporarily unavailable." },
      { status: 502 }
    );
  }
}
