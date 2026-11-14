import { createHmac, timingSafeEqual } from "node:crypto";

export interface SessionPayload {
  name: string;
  email: string;
  picture?: string;
  provider: "google";
  exp: number;
}

export const SESSION_COOKIE_NAME = "undefined_session";
export const OAUTH_STATE_COOKIE_NAME = "undefined_oauth_state";

function getSecret(): string {
  return process.env.AUTH_SECRET || "dev-undefined-secret-change-in-production";
}

export function signSession(
  user: Omit<SessionPayload, "exp">,
  ttlSeconds = 60 * 60 * 24 * 7
): string {
  const payload: SessionPayload = {
    ...user,
    exp: Math.floor(Date.now() / 1000) + ttlSeconds,
  };
  const encoded = Buffer.from(JSON.stringify(payload), "utf8").toString(
    "base64url"
  );
  const sig = createHmac("sha256", getSecret())
    .update(encoded)
    .digest("base64url");
  return `${encoded}.${sig}`;
}

export function verifySession(token: string | undefined): SessionPayload | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;

  const [encoded, sig] = parts;
  const expectedSig = createHmac("sha256", getSecret())
    .update(encoded)
    .digest("base64url");

  const sigBuf = Buffer.from(sig, "utf8");
  const expectedBuf = Buffer.from(expectedSig, "utf8");
  if (sigBuf.length !== expectedBuf.length) return null;
  if (!timingSafeEqual(sigBuf, expectedBuf)) return null;

  try {
    const parsed = JSON.parse(
      Buffer.from(encoded, "base64url").toString("utf8")
    ) as SessionPayload;
    if (!parsed.email || !parsed.name || !parsed.exp) return null;
    if (parsed.exp < Math.floor(Date.now() / 1000)) return null;
    return parsed;
  } catch {
    return null;
  }
}
