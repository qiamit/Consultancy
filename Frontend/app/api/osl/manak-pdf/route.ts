import { NextResponse } from "next/server";
import { getSession } from "@backend/db/auth/session";
import {
  assembledManakPdfBase64,
  getManakPdfInbox,
  markManakPdfReady,
  putManakPdfChunk,
  registerManakPdfInbox,
} from "@backend/modules/bis/manak-pdf-inbox";
import { encodeStoredDocumentRef } from "@backend/modules/storage/technical-staff-documents";
import { DOCUMENTS_BUCKET } from "@backend/modules/storage/documents";
import { uploadObject } from "@backend/modules/storage/s3";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: CORS });
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token")?.trim() || "";
  if (!token) return json({ ready: false, error: "token required" }, 400);
  const entry = getManakPdfInbox(token);
  if (!entry) return json({ ready: false });
  if (!entry.ref) return json({ ready: false, sampleId: entry.sampleId });
  return json({
    ready: true,
    sampleId: entry.sampleId,
    sample_code: entry.sample_code || "",
    ref: entry.ref,
    pdfName: entry.pdfName || "Test_Request.pdf",
  });
}

export async function POST(request: Request) {
  let body: {
    action?: string;
    token?: string;
    sampleId?: string;
    index?: number;
    total?: number;
    chunk?: string;
    pdfName?: string;
    sample_code?: string;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return json({ ok: false, error: "Invalid JSON" }, 400);
  }

  const action = String(body.action || "").trim();
  const token = String(body.token || "").trim();
  if (!token) return json({ ok: false, error: "token required" }, 400);

  if (action === "register") {
    const session = await getSession();
    if (!session?.userId) return json({ ok: false, error: "Unauthorized" }, 401);
    const sampleId = String(body.sampleId || "").trim();
    if (!sampleId) return json({ ok: false, error: "sampleId required" }, 400);
    registerManakPdfInbox(token, sampleId);
    return json({ ok: true });
  }

  if (action === "chunk") {
    const entry = putManakPdfChunk(
      token,
      Number(body.index) || 0,
      Number(body.total) || 0,
      String(body.chunk || ""),
    );
    if (!entry) return json({ ok: false, error: "Unknown token. Open Test Request from the app again." }, 404);
    return json({ ok: true });
  }

  if (action === "finish") {
    const entry = getManakPdfInbox(token);
    if (!entry) return json({ ok: false, error: "Unknown token." }, 404);
    const raw = assembledManakPdfBase64(entry);
    if (!raw) return json({ ok: false, error: "PDF chunks are incomplete." }, 400);
    const pdfName = String(body.pdfName || entry.pdfName || "Test_Request.pdf").replace(/[^\w.\-]+/g, "_");
    const sampleId = (body.sampleId || entry.sampleId || "sample").replace(/[^\w.\-]+/g, "-").slice(0, 80);
    const path = `osl-sample-test-requests/${sampleId}/${Date.now()}-${pdfName.slice(0, 120)}`;
    try {
      await uploadObject(DOCUMENTS_BUCKET, path, Buffer.from(raw, "base64"), "application/pdf");
    } catch (error) {
      return json({
        ok: false,
        error: error instanceof Error ? error.message : "PDF upload failed",
      }, 500);
    }
    markManakPdfReady(token, {
      ref: encodeStoredDocumentRef(path),
      pdfName,
      sample_code: String(body.sample_code || ""),
    });
    return json({ ok: true, ref: encodeStoredDocumentRef(path), pdfName });
  }

  return json({ ok: false, error: "Unsupported action" }, 400);
}
