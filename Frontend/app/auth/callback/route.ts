import { NextResponse } from "next/server";

/** Legacy Supabase auth callback — unused with iron-session password login. */
export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const nextParam = requestUrl.searchParams.get("next");
  const next =
    nextParam && nextParam.startsWith("/") ? nextParam : "/dashboard";
  return NextResponse.redirect(new URL(next, requestUrl.origin));
}
