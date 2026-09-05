import { NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * Same-origin proxy for Google roadmap tiles so the browser canvas can
 * export a Google-looking route map PNG for Word download (no CORS taint).
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const z = Number(searchParams.get("z"));
  const x = Number(searchParams.get("x"));
  const y = Number(searchParams.get("y"));

  if (
    !Number.isInteger(z) ||
    !Number.isInteger(x) ||
    !Number.isInteger(y) ||
    z < 0 ||
    z > 20 ||
    x < 0 ||
    y < 0
  ) {
    return NextResponse.json({ error: "Invalid tile coordinates" }, { status: 400 });
  }

  const maxIndex = 2 ** z - 1;
  if (x > maxIndex || y > maxIndex) {
    return NextResponse.json({ error: "Tile out of range" }, { status: 400 });
  }

  const server = (x + y) % 4;
  const upstream = `https://mt${server}.google.com/vt/lyrs=m&hl=en&x=${x}&y=${y}&z=${z}`;

  try {
    const res = await fetch(upstream, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; ConsultancyMapExport/1.0; +https://localhost)",
        Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
        Referer: "https://maps.google.com/",
      },
      cache: "force-cache",
    });

    if (!res.ok) {
      return NextResponse.json({ error: "Tile fetch failed" }, { status: 502 });
    }

    const bytes = await res.arrayBuffer();
    const contentType = res.headers.get("content-type") || "image/png";

    return new NextResponse(bytes, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400, immutable",
      },
    });
  } catch {
    return NextResponse.json({ error: "Tile proxy error" }, { status: 502 });
  }
}
