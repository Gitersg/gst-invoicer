export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/** Finite, non-negative money/qty. Caps absurd values so storage cannot explode. */
export function money(n: unknown): number {
  const x = typeof n === "number" ? n : Number(n);
  if (!Number.isFinite(x) || x < 0) return 0;
  return round2(Math.min(x, 1_000_000_000));
}

export function formatInr(n: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
  }).format(round2(n));
}

const ONES = [
  "",
  "One",
  "Two",
  "Three",
  "Four",
  "Five",
  "Six",
  "Seven",
  "Eight",
  "Nine",
  "Ten",
  "Eleven",
  "Twelve",
  "Thirteen",
  "Fourteen",
  "Fifteen",
  "Sixteen",
  "Seventeen",
  "Eighteen",
  "Nineteen",
];
const TENS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

function twoDigits(n: number): string {
  if (n < 20) return ONES[n];
  const t = Math.floor(n / 10);
  const o = n % 10;
  return `${TENS[t]}${o ? " " + ONES[o] : ""}`;
}

function chunk(n: number, suffix: string): string {
  if (n === 0) return "";
  if (n > 99) {
    return `${ONES[Math.floor(n / 100)]} Hundred${n % 100 ? " " + twoDigits(n % 100) : ""} ${suffix}`.trim();
  }
  return `${twoDigits(n)} ${suffix}`.trim();
}

export function inrWords(amount: number): string {
  const rupees = Math.floor(round2(amount) + 1e-9);
  const paise = Math.round((round2(amount) - rupees) * 100);
  if (rupees === 0 && paise === 0) return "Zero Rupees Only";

  const crore = Math.floor(rupees / 1_00_00_000);
  const lakh = Math.floor((rupees % 1_00_00_000) / 1_00_000);
  const thousand = Math.floor((rupees % 1_00_000) / 1000);
  const hundred = rupees % 1000;

  const parts = [
    chunk(crore, "Crore"),
    chunk(lakh, "Lakh"),
    chunk(thousand, "Thousand"),
    chunk(hundred, ""),
  ].filter(Boolean);

  const rupeePart = parts.join(" ").replace(/\s+/g, " ").trim() || "Zero";
  const paisePart = paise ? ` and ${twoDigits(paise)} Paise` : "";
  return `${rupeePart} Rupees${paisePart} Only`;
}
