import { randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { OAUTH_STATE_COOKIE_NAME } from "../../../../lib/session";

export async function GET(request: NextRequest) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const origin = request.nextUrl.origin;

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(
      new URL("/login?error=missing_google_env", origin)
    );
  }

  const state = randomBytes(24).toString("hex");
  const redirectUri = `${origin}/api/auth/google/callback`;

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email profile",
    state,
    prompt: "select_account",
  });

  const response = NextResponse.redirect(
    `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
  );

  response.cookies.set(OAUTH_STATE_COOKIE_NAME, state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 10,
  });

  return response;
}
