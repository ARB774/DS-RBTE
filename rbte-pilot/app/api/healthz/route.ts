import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const headers = {
    "Content-Type": "text/plain; charset=utf-8",
    "X-RBTE-Pilot-Edition": "2026-08-23.14",
    "X-RBTE-Pack-AL-Edition": "DPF-EDITION@pilot-2026-08-23.14",
  };

  try {
    await sql`select 1`;
    return new NextResponse("OK database=ready\n", { status: 200, headers });
  } catch (error) {
    console.error("RBTE health check: database unavailable", error);
    return new NextResponse("ERROR database=unavailable\n", {
      status: 503,
      headers,
    });
  }
}
