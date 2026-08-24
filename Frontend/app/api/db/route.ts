import { NextResponse } from "next/server";
import { getSession } from "@backend/db/auth/session";
import { QueryBuilder, type SerializedQuery } from "@backend/db/query-builder";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session?.userId) {
    return NextResponse.json(
      { data: null, error: { message: "Unauthorized" } },
      { status: 401 },
    );
  }

  let body: SerializedQuery;
  try {
    body = (await request.json()) as SerializedQuery;
  } catch {
    return NextResponse.json(
      { data: null, error: { message: "Invalid JSON body" } },
      { status: 400 },
    );
  }

  if (!body?.table || !body?.action) {
    return NextResponse.json(
      { data: null, error: { message: "table and action are required" } },
      { status: 400 },
    );
  }

  const result = await QueryBuilder.fromSerialized(body);
  return NextResponse.json(result);
}
