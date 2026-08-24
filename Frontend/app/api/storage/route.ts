import { NextResponse } from "next/server";
import { getSession } from "@backend/db/auth/session";
import {
  createSignedGetUrl,
  deleteObjects,
  downloadObject,
  uploadObject,
} from "@backend/modules/storage/s3";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session?.userId) {
    return NextResponse.json(
      { data: null, error: { message: "Unauthorized" } },
      { status: 401 },
    );
  }

  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("multipart/form-data")) {
    const form = await request.formData();
    const action = String(form.get("action") ?? "upload");
    const bucket = String(form.get("bucket") ?? "");
    const path = String(form.get("path") ?? "");
    if (action !== "upload") {
      return NextResponse.json(
        { data: null, error: { message: "Unsupported multipart action" } },
        { status: 400 },
      );
    }
    const file = form.get("file");
    if (!bucket || !path || !(file instanceof Blob)) {
      return NextResponse.json(
        { data: null, error: { message: "bucket, path, and file are required" } },
        { status: 400 },
      );
    }
    try {
      const buf = Buffer.from(await file.arrayBuffer());
      const ct =
        String(form.get("contentType") ?? "") ||
        file.type ||
        undefined;
      await uploadObject(bucket, path, buf, ct);
      return NextResponse.json({ data: { path }, error: null });
    } catch (e) {
      return NextResponse.json({
        data: null,
        error: { message: e instanceof Error ? e.message : String(e) },
      });
    }
  }

  let body: {
    action?: string;
    bucket?: string;
    path?: string;
    paths?: string[];
    expiresIn?: number;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json(
      { data: null, error: { message: "Invalid JSON body" } },
      { status: 400 },
    );
  }

  const bucket = body.bucket ?? "";
  try {
    if (body.action === "download") {
      const buf = await downloadObject(bucket, body.path ?? "");
      return new NextResponse(new Uint8Array(buf), {
        headers: {
          "Content-Type": "application/octet-stream",
          "Content-Disposition": `attachment; filename="${(body.path ?? "file").split("/").pop()}"`,
        },
      });
    }
    if (body.action === "remove") {
      await deleteObjects(bucket, body.paths ?? []);
      return NextResponse.json({ data: body.paths ?? [], error: null });
    }
    if (body.action === "createSignedUrl") {
      const signedUrl = await createSignedGetUrl(
        bucket,
        body.path ?? "",
        body.expiresIn ?? 3600,
      );
      return NextResponse.json({ data: { signedUrl }, error: null });
    }
    return NextResponse.json(
      { data: null, error: { message: `Unknown action: ${body.action}` } },
      { status: 400 },
    );
  } catch (e) {
    return NextResponse.json({
      data: null,
      error: { message: e instanceof Error ? e.message : String(e) },
    });
  }
}
