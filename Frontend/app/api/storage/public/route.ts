import { NextResponse } from "next/server";
import { getSession } from "@backend/db/auth/session";
import { downloadObject } from "@backend/modules/storage/s3";

function contentTypeForFilename(filename: string): string {
  const lower = filename.toLowerCase();
  if (lower.endsWith(".pdf")) return "application/pdf";
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".gif")) return "image/gif";
  if (lower.endsWith(".doc")) return "application/msword";
  if (lower.endsWith(".docx")) {
    return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  }
  return "application/octet-stream";
}

export async function GET(request: Request) {
  const session = await getSession();
  if (!session?.userId) {
    return NextResponse.json(
      { error: { message: "Unauthorized" } },
      { status: 401 },
    );
  }

  const url = new URL(request.url);
  const bucket = url.searchParams.get("bucket") ?? "";
  const path = url.searchParams.get("path") ?? "";
  const dispositionParam = (url.searchParams.get("disposition") ?? "inline")
    .trim()
    .toLowerCase();
  const disposition =
    dispositionParam === "attachment" ? "attachment" : "inline";

  if (!bucket || !path) {
    return NextResponse.json(
      { error: { message: "bucket and path are required" } },
      { status: 400 },
    );
  }

  try {
    const buf = await downloadObject(bucket, path);
    const filename = path.split("/").pop() || "file";
    const safeName = filename.replace(/"/g, "");
    return new NextResponse(new Uint8Array(buf), {
      status: 200,
      headers: {
        "Content-Type": contentTypeForFilename(filename),
        "Content-Disposition": `${disposition}; filename="${safeName}"`,
        "Content-Length": String(buf.byteLength),
        "Cache-Control": "private, max-age=60",
      },
    });
  } catch (e) {
    return NextResponse.json(
      {
        error: {
          message: e instanceof Error ? e.message : String(e),
        },
      },
      { status: 500 },
    );
  }
}
