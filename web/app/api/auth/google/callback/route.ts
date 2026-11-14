import { NextRequest, NextResponse } from "next/server";
import {
  OAUTH_STATE_COOKIE_NAME,
  SESSION_COOKIE_NAME,
  signSession,
} from "../../../../../lib/session";

interface GoogleTokenResponse {
  access_token?: string;
  error?: string;
}

interface GoogleUserInfo {
  name?: string;
  email?: string;
  picture?: string;
}

export async function GET(request: NextRequest) {
  const origin = request.nextUrl.origin;
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const oauthError = request.nextUrl.searchParams.get("error");
  const storedState = request.cookies.get(OAUTH_STATE_COOKIE_NAME)?.value;

  if (oauthError || !code || !state || !storedState || state !== storedState) {
    const res = NextResponse.redirect(
      new URL("/login?error=oauth_failed", origin)
    );
    res.cookies.delete(OAUTH_STATE_COOKIE_NAME);
    return res;
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return NextResponse.redirect(
      new URL("/login?error=missing_google_env", origin)
    );
  }

  try {
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: `${origin}/api/auth/google/callback`,
        grant_type: "authorization_code",
      }),
    });

    const tokenData = (await tokenRes.json()) as GoogleTokenResponse;
    if (!tokenRes.ok || !tokenData.access_token) {
      return NextResponse.redirect(new URL("/login?error=oauth_failed", origin));
    }

    const userRes = await fetch(
      "https://www.googleapis.com/oauth2/v3/userinfo",
      {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      }
    );

    const profile = (await userRes.json()) as GoogleUserInfo;
    if (!userRes.ok || !profile.email) {
      return NextResponse.redirect(new URL("/login?error=oauth_failed", origin));
    }

    const sessionToken = signSession({
      name: profile.name || profile.email.split("@")[0] || "Usuario Google",
      email: profile.email,
      picture: profile.picture,
      provider: "google",
    });

    const response = NextResponse.redirect(new URL("/dashboard", origin));
    response.cookies.delete(OAUTH_STATE_COOKIE_NAME);
    response.cookies.set(SESSION_COOKIE_NAME, sessionToken, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    return response;
  } catch {
    return NextResponse.redirect(new URL("/login?error=oauth_failed", origin));
  }
}
