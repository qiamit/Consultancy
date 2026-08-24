import { NextResponse } from "next/server";
import { getSession } from "@backend/db/auth/session";
import { createSignedGetUrl } from "@backend/modules/storage/s3";

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
  if (!bucket || !path) {
    return NextResponse.json(
      { error: { message: "bucket and path are required" } },
      { status: 400 },
    );
  }

  try {
    const signedUrl = await createSignedGetUrl(bucket, path, 3600);
    return NextResponse.redirect(signedUrl);
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
