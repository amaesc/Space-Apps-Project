import Image from "next/image";
import { asset } from "../lib/asset";
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="relative flex min-h-[100dvh] items-end justify-center overflow-hidden bg-[#0d0818] px-4 py-8 text-[#f4f6f8] sm:px-8 sm:py-12 md:justify-start">
      {/* Vivid background image, unobstructed in the center */}
      <Image
        src={asset("/images/error-frozen.jpg")}
        alt="404 error background: the frozen UNDEFINED mascot"
        fill
        sizes="100vw"
        className="object-cover object-center opacity-95"
        priority
      />

      {/* Subtle edge vignette to keep contrast without dimming the character */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#0d0818]/85 via-transparent to-[#0d0818]/25 md:bg-gradient-to-tr md:from-[#0d0818]/90 md:via-[#0d0818]/20 md:to-transparent"
      />

      {/* Compact card in the bottom-left corner to keep the mascot clear */}
      <div className="relative z-10 w-full max-w-md rounded-[1.5rem] border border-sky-300/25 bg-[#0d0818]/55 p-1.5 shadow-[0_24px_60px_-15px_rgba(0,0,0,0.85)] backdrop-blur-lg">
        <div className="rounded-[calc(1.5rem-0.375rem)] bg-[#140d24]/70 p-6 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)] sm:p-7">
          <div className="flex items-center justify-between gap-3">
            <span className="inline-block rounded-full border border-sky-400/35 bg-sky-500/15 px-3 py-0.5 font-mono text-[10px] uppercase tracking-[0.18em] text-sky-200">
              if (error) &#123; undefined &#125;
            </span>
            <span className="font-mono text-2xl font-bold tracking-tight bg-gradient-to-r from-sky-300 via-white to-[#fb923c] bg-clip-text text-transparent">
              404
            </span>
          </div>

          <h1 className="mt-4 text-xl font-bold uppercase tracking-tight text-white sm:text-2xl">
            Page not found
          </h1>

          <p className="mt-2 text-sm leading-relaxed text-slate-200">
            This coordinate froze or does not exist. Head back to the{" "}
            <strong className="text-white">FireData</strong> map.
          </p>

          <div className="mt-6">
            <Link
              href="/"
              className="group inline-flex items-center gap-3 rounded-full bg-gradient-to-r from-[#f97316] to-[#ea580c] py-2 pl-5 pr-2 text-sm font-semibold text-white shadow-[0_0_28px_-4px_rgba(249,115,22,0.7)] transition-all duration-300 hover:brightness-110 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              <span>Go to the map</span>
              <span
                aria-hidden="true"
                className="flex h-7 w-7 items-center justify-center rounded-full bg-black/25 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
              >
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 12 12"
                  fill="none"
                  className="stroke-current"
                >
                  <path
                    d="M3 9L9 3M9 3H4.5M9 3V7.5"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
