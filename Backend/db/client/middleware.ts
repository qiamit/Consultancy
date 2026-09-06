import { NextResponse, type NextRequest } from "next/server";
import {
  getSessionFromRequest,
  getSessionOptions,
} from "@backend/db/auth/session";

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32) {
    return response;
  }

  try {
    // Touch options early so misconfiguration fails softly.
    getSessionOptions();

    const { data: session, response: sessionResponse } =
      await getSessionFromRequest(request);
    response = sessionResponse;

    const isAuthRoute =
      request.nextUrl.pathname.startsWith("/login") ||
      request.nextUrl.pathname.startsWith("/signup");

    if (!session && request.nextUrl.pathname.startsWith("/dashboard")) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = "/login";
      const nextPath = `${request.nextUrl.pathname}${request.nextUrl.search}`;
      redirectUrl.search = "";
      redirectUrl.searchParams.set("next", nextPath);
      return NextResponse.redirect(redirectUrl);
    }

    if (session && isAuthRoute) {
      const nextRaw = request.nextUrl.searchParams.get("next");
      const next =
        nextRaw && nextRaw.startsWith("/") && !nextRaw.startsWith("//")
          ? nextRaw
          : "/dashboard";
      return NextResponse.redirect(new URL(next, request.nextUrl.origin));
    }
  } catch {
    // Session / secret issues must not blank the whole site.
  }

  return response;
}
