export default function FlameLogo({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={(size * 52) / 44} viewBox="0 0 44 52" aria-hidden="true">
      <defs>
        <linearGradient id="logo-flame-outer" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor="#f05a0a" />
          <stop offset="0.6" stopColor="#ff7a18" />
          <stop offset="1" stopColor="#ffb347" />
        </linearGradient>
        <linearGradient id="logo-flame-inner" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor="#ffd27a" />
          <stop offset="1" stopColor="#ff9a2e" />
        </linearGradient>
      </defs>
      <path
        d="M22 2 C26 10 33 14 33 22 C36 19 37 15 36 11 C41 17 43 24 43 31 C43 43 34 51 22 51 C10 51 1 43 1 31 C1 23 5 17 10 13 C10 18 12 21 15 23 C14 14 17 7 22 2 Z"
        fill="url(#logo-flame-outer)"
      />
      <path
        d="M22 22 C24 28 31 31 31 39 C31 45 27 49 22 49 C17 49 13 45 13 39 C13 35 15 32 17 30 C17 33 18 35 20 36 C19 31 20 26 22 22 Z"
        fill="url(#logo-flame-inner)"
      />
    </svg>
  );
}
