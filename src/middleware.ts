import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const MAINTENANCE_HTML = `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Qready – Temporarily unavailable</title></head><body style="margin:0;min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;background:#18181b;color:#fff;font-family:system-ui,sans-serif;text-align:center;padding:1rem"><h1 style="font-size:1.5rem;font-weight:600">Temporarily unavailable</h1><p style="margin-top:0.5rem;color:#a1a1aa">Qready is currently offline for maintenance. Please try again later.</p></body></html>`;

export function middleware(request: NextRequest) {
  const raw = (process.env.MAINTENANCE_MODE ?? "").toLowerCase();
  const isMaintenance =
    raw === "true" || raw === "1" || raw === "yes" || raw === "on";

  if (isMaintenance) {
    return new NextResponse(MAINTENANCE_HTML, {
      status: 503,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except _next/static, _next/image, favicon, etc.
     */
    "/((?!_next/static|_next/image|favicon.ico|qready-logo.png|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
