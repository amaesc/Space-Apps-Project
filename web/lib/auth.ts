export interface AuthUser {
  name: string;
  email: string;
  organization?: string;
  picture?: string;
  provider?: "local" | "google";
}

const STORAGE_KEY = "undefined_auth_user";
const AUTH_EVENT = "undefined-auth-change";

export function getStoredUser(): AuthUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<AuthUser>;
    if (!parsed.email || !parsed.name) return null;
    return {
      name: parsed.name,
      email: parsed.email,
      organization: parsed.organization,
      picture: parsed.picture,
      provider: parsed.provider,
    };
  } catch {
    return null;
  }
}

export function saveStoredUser(user: AuthUser): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
  window.dispatchEvent(new Event(AUTH_EVENT));
}

export function clearStoredUser(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
  window.dispatchEvent(new Event(AUTH_EVENT));
}

export async function fetchServerSession(): Promise<AuthUser | null> {
  try {
    const res = await fetch("/api/auth/session", { cache: "no-store" });
    if (!res.ok) return null;
    const data = (await res.json()) as { user?: AuthUser | null };
    return data.user ?? null;
  } catch {
    return null;
  }
}

export async function logoutAll(): Promise<void> {
  clearStoredUser();
  try {
    await fetch("/api/auth/logout", { method: "POST" });
  } catch {
    // Ignore network error during client logout
  }
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(AUTH_EVENT));
  }
}

export function subscribeAuthChange(callback: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const handler = () => callback();
  window.addEventListener(AUTH_EVENT, handler);
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener(AUTH_EVENT, handler);
    window.removeEventListener("storage", handler);
  };
}
