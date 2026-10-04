import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;

  if (!secret) {
    return NextResponse.json(
      { success: false, error: "CRON_SECRET is not configured" },
      { status: 500 }
    );
  }

  const response = await fetch(
    new URL("/api/cron/email/reenrolment-opening", request.url),
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secret}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        academicYear: 2026,
        term: 4,
        confirm: "SEND",
      }),
      cache: "no-store",
    }
  );

  const body = await response.text();

  return new NextResponse(body, {
    status: response.status,
    headers: {
      "Content-Type":
        response.headers.get("Content-Type") || "application/json",
    },
  });
}