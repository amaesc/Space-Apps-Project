"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useState } from "react";
import FluidNav from "../../components/FluidNav";
import {
  getStoredUser,
  saveStoredUser,
  subscribeAuthChange,
} from "../../lib/auth";

type AuthMode = "login" | "register";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>("login");
  const [name, setName] = useState("");
  const [organization, setOrganization] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const resetIfSignedOut = () => {
      if (!getStoredUser()) {
        setSubmitting(false);
        setError(null);
      }
    };

    resetIfSignedOut();
    const unsubscribe = subscribeAuthChange(resetIfSignedOut);
    window.addEventListener("pageshow", resetIfSignedOut);

    return () => {
      unsubscribe();
      window.removeEventListener("pageshow", resetIfSignedOut);
    };
  }, []);

  const switchMode = (nextMode: AuthMode) => {
    setMode(nextMode);
    setError(null);
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !trimmedEmail.includes("@")) {
      setError("Ingresa un correo electrónico válido.");
      return;
    }

    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres.");
      return;
    }

    if (mode === "register") {
      if (!name.trim()) {
        setError("Ingresa tu nombre completo para crear la cuenta.");
        return;
      }
      if (password !== confirmPassword) {
        setError("Las contraseñas no coinciden.");
        return;
      }
    }

    setSubmitting(true);

    const displayName =
      mode === "register"
        ? name.trim()
        : trimmedEmail.split("@")[0] || "Operador";

    // TODO: Conectar con endpoint real de autenticación (/api/auth/login o /api/auth/register)
    try {
      saveStoredUser({
        name: displayName,
        email: trimmedEmail,
        organization: organization.trim() || undefined,
      });
      router.push("/dashboard");
    } catch {
      setSubmitting(false);
      setError("No se pudo guardar la sesión. Inténtalo de nuevo.");
      return;
    }

    window.setTimeout(() => setSubmitting(false), 1500);
  };

  const handleGoogleAuth = () => {
    setError(null);
    setSubmitting(true);

    // TODO: Redirigir al flujo real de Google OAuth (e.g. /api/auth/google)
    try {
      saveStoredUser({
        name: "Cuenta Google",
        email: "operador@gmail.com",
        organization: "Google OAuth",
      });
      router.push("/dashboard");
    } catch {
      setSubmitting(false);
      setError("No se pudo iniciar sesión con Google. Inténtalo de nuevo.");
      return;
    }

    window.setTimeout(() => setSubmitting(false), 1500);
  };

  return (
    <div className="relative min-h-dvh bg-[#0d0818] text-[#f4f6f8]">
      <div
        aria-hidden="true"
        className="noise-overlay pointer-events-none fixed inset-0 z-50 opacity-[0.025]"
      />

      <FluidNav />

      <main className="relative overflow-hidden">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-24 left-1/4 h-104 w-104 rounded-full bg-violet-600/20 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute bottom-0 right-1/6 h-88 w-88 rounded-full bg-[#f97316]/15 blur-3xl"
        />

        <div className="relative mx-auto grid max-w-6xl items-center gap-10 px-4 py-12 sm:px-6 lg:grid-cols-12 lg:py-16">
          {/* Columna izquierda: imagen protagonista con marco luminoso */}
          <div className="lg:col-span-5">
            <div className="mb-5">
              <span className="inline-flex items-center gap-2 rounded-full border border-orange-400/30 bg-[#f97316]/10 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.2em] text-[#fb923c]">
                <span
                  aria-hidden="true"
                  className="h-1.5 w-1.5 rounded-full bg-[#f97316]"
                />
                Centro de acceso
              </span>

              <h1 className="mt-4 text-balance text-3xl font-bold uppercase leading-[1.06] tracking-[-0.02em] text-white sm:text-4xl">
                Control{" "}
                <span className="bg-linear-to-r from-[#fb923c] via-[#f97316] to-amber-300 bg-clip-text text-transparent">
                  operativo
                </span>{" "}
                del fuego
              </h1>

              <p className="mt-2.5 text-sm leading-relaxed text-slate-300">
                Series{" "}
                <span className="font-mono text-xs text-sky-300">MODIS</span> /{" "}
                <span className="font-mono text-xs text-[#f59e0b]">VIIRS</span>,
                telemetría IoT en campo y estimación de origen probable.
              </p>
            </div>

            {/* Tarjeta protagonista para mascot-pod.jpg */}
            <div className="relative">
              {/* Resplandor trasero para que la imagen sobresalga */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -inset-3 rounded-4xl bg-linear-to-tr from-[#f97316]/35 via-violet-500/25 to-amber-400/25 blur-2xl"
              />

              <div className="relative rounded-[1.75rem] bg-linear-to-br from-[#fb923c]/70 via-violet-400/40 to-[#ea580c]/70 p-0.5 shadow-[0_28px_70px_-12px_rgba(249,115,22,0.35)]">
                <div className="relative overflow-hidden rounded-[calc(1.75rem-2px)] bg-[#0f091c]">
                  <div className="relative aspect-4/3 w-full">
                    <Image
                      src="/images/mascot-pod.jpg"
                      alt="Mascota UNDEFINED en estación de monitoreo"
                      fill
                      sizes="(max-width: 1024px) 100vw, 460px"
                      className="object-cover object-center transition-transform duration-700 hover:scale-[1.03]"
                      priority
                    />
                    <div className="absolute inset-0 bg-linear-to-t from-[#0d0818]/90 via-transparent to-[#0d0818]/20" />

                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Columna derecha: tarjeta Double-Bezel de Login / Registro */}
          <div className="lg:col-span-7 lg:pl-6">
            <div className="relative rounded-[1.75rem] border border-violet-400/20 bg-white/3 p-1.5 shadow-[0_24px_70px_-15px_rgba(0,0,0,0.85)]">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-10 top-0 h-0.5 bg-linear-to-r from-transparent via-[#f97316] to-transparent opacity-75"
              />

              <div className="rounded-[1.375rem] bg-[#140d24] p-6 shadow-[inset_0_1px_1px_rgba(255,255,255,0.08)] sm:p-8">
                {/* Selector de pestañas */}
                <div
                  role="tablist"
                  aria-label="Modo de autenticación"
                  className="grid grid-cols-2 rounded-full border border-white/10 bg-[#0d0818] p-1"
                >
                  <button
                    type="button"
                    role="tab"
                    aria-selected={mode === "login"}
                    onClick={() => switchMode("login")}
                    className={`cursor-pointer rounded-full px-4 py-2 text-xs font-semibold transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white sm:text-sm ${
                      mode === "login"
                        ? "bg-linear-to-r from-[#f97316] to-[#ea580c] text-white shadow-[0_0_20px_-4px_rgba(249,115,22,0.6)]"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    Iniciar sesión
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={mode === "register"}
                    onClick={() => switchMode("register")}
                    className={`cursor-pointer rounded-full px-4 py-2 text-xs font-semibold transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white sm:text-sm ${
                      mode === "register"
                        ? "bg-linear-to-r from-[#f97316] to-[#ea580c] text-white shadow-[0_0_20px_-4px_rgba(249,115,22,0.6)]"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    Crear cuenta
                  </button>
                </div>

                <div className="mt-6">
                  <h2 className="text-xl font-semibold text-white">
                    {mode === "login"
                      ? "Bienvenido de nuevo"
                      : "Registra tu acceso"}
                  </h2>
                  <p className="mt-1 text-xs text-slate-400 sm:text-sm">
                    {mode === "login"
                      ? "Accede con tus credenciales de operador o investigador."
                      : "Crea una cuenta para gestionar áreas de interés y descargas."}
                  </p>
                </div>

                {error && (
                  <div
                    role="alert"
                    className="mt-5 rounded-xl border border-red-400/35 bg-red-500/10 px-4 py-3 text-xs text-red-200"
                  >
                    {error}
                  </div>
                )}

                <form onSubmit={handleSubmit} className="mt-6 space-y-4" noValidate>
                  {mode === "register" && (
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label
                          htmlFor="auth-name"
                          className="block font-mono text-[11px] uppercase tracking-wider text-slate-300"
                        >
                          Nombre completo
                        </label>
                        <input
                          id="auth-name"
                          type="text"
                          autoComplete="name"
                          required
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="Ana López"
                          className="mt-1.5 w-full rounded-xl border border-white/10 bg-[#0d0818] px-3.5 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-orange-400/70 focus:outline-none focus:ring-2 focus:ring-orange-400/30"
                        />
                      </div>

                      <div>
                        <label
                          htmlFor="auth-org"
                          className="block font-mono text-[11px] uppercase tracking-wider text-slate-300"
                        >
                          Organización (opcional)
                        </label>
                        <input
                          id="auth-org"
                          type="text"
                          autoComplete="organization"
                          value={organization}
                          onChange={(e) => setOrganization(e.target.value)}
                          placeholder="CONAFOR / Brigada"
                          className="mt-1.5 w-full rounded-xl border border-white/10 bg-[#0d0818] px-3.5 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-orange-400/70 focus:outline-none focus:ring-2 focus:ring-orange-400/30"
                        />
                      </div>
                    </div>
                  )}

                  <div>
                    <label
                      htmlFor="auth-email"
                      className="block font-mono text-[11px] uppercase tracking-wider text-slate-300"
                    >
                      Correo electrónico
                    </label>
                    <input
                      id="auth-email"
                      type="email"
                      autoComplete="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="operador@undefined.mx"
                      className="mt-1.5 w-full rounded-xl border border-white/10 bg-[#0d0818] px-3.5 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-orange-400/70 focus:outline-none focus:ring-2 focus:ring-orange-400/30"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between">
                      <label
                        htmlFor="auth-password"
                        className="block font-mono text-[11px] uppercase tracking-wider text-slate-300"
                      >
                        Contraseña
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowPassword((prev) => !prev)}
                        className="cursor-pointer font-mono text-[11px] text-slate-400 transition-colors hover:text-white"
                      >
                        {showPassword ? "Ocultar" : "Mostrar"}
                      </button>
                    </div>
                    <input
                      id="auth-password"
                      type={showPassword ? "text" : "password"}
                      autoComplete={
                        mode === "login" ? "current-password" : "new-password"
                      }
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Mínimo 6 caracteres"
                      className="mt-1.5 w-full rounded-xl border border-white/10 bg-[#0d0818] px-3.5 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-orange-400/70 focus:outline-none focus:ring-2 focus:ring-orange-400/30"
                    />
                  </div>

                  {mode === "register" && (
                    <div>
                      <label
                        htmlFor="auth-confirm-password"
                        className="block font-mono text-[11px] uppercase tracking-wider text-slate-300"
                      >
                        Confirmar contraseña
                      </label>
                      <input
                        id="auth-confirm-password"
                        type={showPassword ? "text" : "password"}
                        autoComplete="new-password"
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Repite tu contraseña"
                        className="mt-1.5 w-full rounded-xl border border-white/10 bg-[#0d0818] px-3.5 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-orange-400/70 focus:outline-none focus:ring-2 focus:ring-orange-400/30"
                      />
                    </div>
                  )}

                  {mode === "login" && (
                    <div className="flex items-center justify-between pt-1 text-xs">
                      <label className="flex cursor-pointer items-center gap-2 text-slate-300">
                        <input
                          type="checkbox"
                          defaultChecked
                          className="h-4 w-4 rounded border-white/20 bg-[#0d0818] accent-[#f97316]"
                        />
                        <span>Mantener sesión en este dispositivo</span>
                      </label>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={submitting}
                    className="mt-2 inline-flex w-full cursor-pointer items-center justify-center rounded-xl bg-linear-to-r from-[#f97316] to-[#ea580c] px-6 py-3 text-sm font-semibold text-white shadow-[0_0_28px_-4px_rgba(249,115,22,0.7)] transition-all duration-300 hover:brightness-110 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                  >
                    {submitting
                      ? "Procesando..."
                      : mode === "login"
                        ? "Iniciar sesión"
                        : "Crear cuenta"}
                  </button>
                </form>

                {/* Separador y botón Google OAuth */}
                <div className="my-5 flex items-center gap-3">
                  <div className="h-px flex-1 bg-white/8" />
                  <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-400">
                    o continúa con
                  </span>
                  <div className="h-px flex-1 bg-white/8" />
                </div>

                <button
                  type="button"
                  onClick={handleGoogleAuth}
                  disabled={submitting}
                  className="inline-flex w-full cursor-pointer items-center justify-center gap-3 rounded-xl border border-white/15 bg-white/4 px-5 py-2.5 text-sm font-medium text-white transition-all duration-200 hover:border-white/30 hover:bg-white/8 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                >
                  <svg
                    aria-hidden="true"
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                  >
                    <path
                      fill="#EA4335"
                      d="M12 5.04c1.94 0 3.51.73 4.61 1.77l3.18-3.18C17.85 1.82 15.17.75 12 .75 7.4.75 3.43 3.39 1.5 7.24l3.7 2.87C6.09 7.12 8.81 5.04 12 5.04z"
                    />
                    <path
                      fill="#4285F4"
                      d="M23.49 12.27c0-.79-.07-1.54-.2-2.27H12v4.51h6.45c-.29 1.51-1.14 2.79-2.4 3.65l3.72 2.88c2.18-2.01 3.72-4.97 3.72-8.77z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.2 14.89A6.95 6.95 0 0 1 4.82 12c0-1.01.18-1.99.49-2.89L1.61 6.24A11.24 11.24 0 0 0 .75 12c0 1.81.43 3.53 1.2 5.06l3.25-2.17z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23.25c3.24 0 5.95-1.07 7.93-2.91l-3.72-2.88c-1.07.72-2.45 1.15-4.21 1.15-3.19 0-5.91-2.08-6.8-4.97l-3.7 2.87C3.43 20.61 7.4 23.25 12 23.25z"
                    />
                  </svg>
                  <span>
                    {mode === "login"
                      ? "Continuar con Google"
                      : "Registrarse con Google"}
                  </span>
                </button>

                <div className="mt-6 flex flex-wrap items-center justify-end gap-2 border-t border-white/[0.07] pt-4 text-xs text-slate-400">
                  <Link
                    href="/"
                    className="font-medium text-slate-200 underline decoration-slate-500 underline-offset-4 transition-colors hover:text-white"
                  >
                    Volver al inicio
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
