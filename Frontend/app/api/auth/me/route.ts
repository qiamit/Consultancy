import { NextResponse } from "next/server";
import { clearSession, getSession } from "@backend/db/auth/session";
import { findUserById, toAppUser } from "@backend/db/auth/users";

export async function GET() {
  const session = await getSession();
  if (!session?.userId) {
    return NextResponse.json({ data: { user: null }, error: null });
  }
  const row = await findUserById(session.userId);
  if (!row) {
    return NextResponse.json({ data: { user: null }, error: null });
  }
  return NextResponse.json({ data: { user: toAppUser(row) }, error: null });
}

export async function DELETE() {
  await clearSession();
  return NextResponse.json({ error: null });
}
