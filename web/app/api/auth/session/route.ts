import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE_NAME, verifySession } from "../../../../lib/session";

export async function GET(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const session = verifySession(token);
  if (!session) {
    return NextResponse.json({ user: null });
  }

  return NextResponse.json({
    user: {
      name: session.name,
      email: session.email,
      organization: "Google OAuth",
      picture: session.picture,
      provider: session.provider,
    },
  });
}
