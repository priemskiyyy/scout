const PATHS = {
  search: "m21 21-4.4-4.4M10.5 18a7.5 7.5 0 1 0 0-15 7.5 7.5 0 0 0 0 15Z",
  close: "m6 6 12 12M6 18 18 6",
  code: "m8 7-5 5 5 5m8-10 5 5-5 5m-3-14-2 18",
  arrow: "M5 12h14m-5-5 5 5-5 5",
  compass: "m16 8-3 5-5 3 3-5 5-3ZM12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Z",
  audio: "M4 14v-3a8 8 0 0 1 16 0v3M4 12H3v7h4v-7H4Zm16 0h1v7h-4v-7h3Z",
  input:
    "M3 6h18v12H3V6Zm3 3h1m3 0h1m3 0h1m3 0h1M6 12h1m3 0h1m3 0h1m3 0h1M8 15h8",
  kitchen:
    "M4 8h12v8a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4V8Zm12 1h2a3 3 0 0 1 0 6h-2M7 2v3m4-3v3",
  lighting: "m8 3-4 11h16L16 3H8Zm4 11v7m-4 0h8",
  optics:
    "M5 5h4l1 7v8H2v-8l3-7Zm10 0h4l3 7v8h-8v-8l1-7ZM10 12h4M5 5V3h3v2m8 0V3h3v2",
  box: "m12 3 9 5-9 5-9-5 9-5Zm-9 5v10l9 5 9-5V8m-9 5v10",
};

type IconProps = { name: keyof typeof PATHS; size?: number };

export const Icon = ({ name, size = 20 }: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d={PATHS[name]} />
  </svg>
);
