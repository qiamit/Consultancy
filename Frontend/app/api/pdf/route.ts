import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 120;

function upstreamPdfUrl(): string {
  const fromEnv = (
    process.env.PDF_SERVICE_URL ||
    process.env.NEXT_PUBLIC_PDF_SERVICE_URL ||
    ""
  ).trim();
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  return "http://127.0.0.1:3847/pdf";
}

/**
 * Same-origin proxy → Playwright PDF service.
 * Browser calls POST /api/pdf; this forwards to PDF_SERVICE_URL (default :3847/pdf).
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON body required" }, { status: 400 });
  }

  const upstream = upstreamPdfUrl();
  let res: Response;
  try {
    res = await fetch(upstream, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(110_000),
    });
  } catch (err) {
    const message =
      err instanceof Error && /abort|timeout/i.test(err.message)
        ? "PDF service timed out"
        : "PDF service is not running. Start it with: cd pdf-service && npm run start";
    return NextResponse.json({ error: message }, { status: 502 });
  }

  if (!res.ok) {
    let detail = "";
    try {
      const j = (await res.json()) as { error?: string };
      detail = j.error?.trim() || "";
    } catch {
      detail = await res.text().catch(() => "");
    }
    return NextResponse.json(
      {
        error:
          detail ||
          `PDF service error (${res.status}). Check PDF_SERVICE_URL.`,
      },
      { status: res.status >= 400 && res.status < 600 ? res.status : 502 },
    );
  }

  const pdf = await res.arrayBuffer();
  if (!pdf.byteLength) {
    return NextResponse.json({ error: "PDF service returned an empty file" }, { status: 502 });
  }

  // Use inline so the browser does not auto-save this fetch response as a second
  // "temp" download; the client triggers a single named PDF via blob + <a download>.
  return new NextResponse(pdf, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'inline; filename="document.pdf"',
      "Content-Length": String(pdf.byteLength),
      "Cache-Control": "no-store",
    },
  });
}

export async function GET() {
  const healthUrl = upstreamPdfUrl().replace(/\/pdf\/?$/, "/health");
  try {
    const res = await fetch(healthUrl, { signal: AbortSignal.timeout(5_000) });
    if (!res.ok) {
      return NextResponse.json(
        { ok: false, error: "PDF service health check failed" },
        { status: 502 },
      );
    }
    return NextResponse.json({ ok: true, service: "playwright-pdf-proxy" });
  } catch {
    return NextResponse.json(
      {
        ok: false,
        error: "PDF service is not running. Start it with: cd pdf-service && npm run start",
      },
      { status: 502 },
    );
  }
}
