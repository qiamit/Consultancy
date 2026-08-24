import { getIronSession, type SessionOptions } from "iron-session";
import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";

export const SESSION_COOKIE_NAME = "qe_session";

export type SessionData = {
  userId: string;
  email: string;
};

const TTL_SECONDS = 60 * 60 * 24 * 14;

export function getSessionOptions(): SessionOptions {
  const password = process.env.SESSION_SECRET ?? "";
  if (password.length < 32) {
    throw new Error(
      "SESSION_SECRET must be set and at least 32 characters long.",
    );
  }
  return {
    password,
    cookieName: SESSION_COOKIE_NAME,
    ttl: TTL_SECONDS,
    cookieOptions: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: TTL_SECONDS,
    },
  };
}

export async function getSession(): Promise<SessionData | null> {
  try {
    const cookieStore = await cookies();
    const session = await getIronSession<SessionData>(
      cookieStore,
      getSessionOptions(),
    );
    if (!session.userId || !session.email) return null;
    return { userId: session.userId, email: session.email };
  } catch {
    return null;
  }
}

export async function setSession(userId: string, email: string): Promise<void> {
  const cookieStore = await cookies();
  const session = await getIronSession<SessionData>(
    cookieStore,
    getSessionOptions(),
  );
  session.userId = userId;
  session.email = email;
  await session.save();
}

export async function clearSession(): Promise<void> {
  const cookieStore = await cookies();
  const session = await getIronSession<SessionData>(
    cookieStore,
    getSessionOptions(),
  );
  session.destroy();
}

export async function getSessionFromRequest(
  request: NextRequest,
): Promise<{ data: SessionData | null; response: NextResponse }> {
  const response = NextResponse.next({ request });
  try {
    const session = await getIronSession<SessionData>(
      request,
      response,
      getSessionOptions(),
    );
    if (!session.userId || !session.email) {
      return { data: null, response };
    }
    return {
      data: { userId: session.userId, email: session.email },
      response,
    };
  } catch {
    return { data: null, response };
  }
}

export async function saveSessionToResponse(
  request: NextRequest,
  response: NextResponse,
  data: SessionData | null,
): Promise<NextResponse> {
  const session = await getIronSession<SessionData>(
    request,
    response,
    getSessionOptions(),
  );
  if (!data) {
    session.destroy();
  } else {
    session.userId = data.userId;
    session.email = data.email;
    await session.save();
  }
  return response;
}
