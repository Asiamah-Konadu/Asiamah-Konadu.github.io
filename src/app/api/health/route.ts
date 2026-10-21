import { NextResponse } from "next/server";
import { HUBTEL_CONFIGURED } from "@/lib/hubtel";

export async function GET() {
  return NextResponse.json({
    ok: true,
    hubtelConfigured: HUBTEL_CONFIGURED
  });
}
