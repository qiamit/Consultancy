import { NextResponse } from "next/server";
import { getRegulatoryUpdates } from "@/lib/updates/get-regulatory-updates";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const result = await getRegulatoryUpdates();
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load updates";
    console.error("GET /api/regulatory-updates:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
