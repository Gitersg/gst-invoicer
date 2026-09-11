import { money, round2 } from "./inr";
import type { GstMode, Invoice, LineItem } from "./types";

export const GST_RATES = [0, 3, 5, 12, 18, 28] as const;

export const DOC_TITLES = [
  "Tax Invoice",
  "Bill",
  "Invoice",
  "Bill of Supply",
  "Proforma Invoice",
] as const;

/** GSTIN first two digits → state / UT (place of supply). */
export const STATE_BY_CODE: Record<string, string> = {
  "01": "Jammu and Kashmir",
  "02": "Himachal Pradesh",
  "03": "Punjab",
  "04": "Chandigarh",
  "05": "Uttarakhand",
  "06": "Haryana",
  "07": "Delhi",
  "08": "Rajasthan",
  "09": "Uttar Pradesh",
  "10": "Bihar",
  "11": "Sikkim",
  "12": "Arunachal Pradesh",
  "13": "Nagaland",
  "14": "Manipur",
  "15": "Mizoram",
  "16": "Tripura",
  "17": "Meghalaya",
  "18": "Assam",
  "19": "West Bengal",
  "20": "Jharkhand",
  "21": "Odisha",
  "22": "Chhattisgarh",
  "23": "Madhya Pradesh",
  "24": "Gujarat",
  "27": "Maharashtra",
  "29": "Karnataka",
  "30": "Goa",
  "32": "Kerala",
  "33": "Tamil Nadu",
  "36": "Telangana",
  "37": "Andhra Pradesh",
};

export const INDIAN_STATES = [...new Set(Object.values(STATE_BY_CODE))].sort();

export function lineTaxable(item: LineItem): number {
  return money((Number(item.qty) || 0) * (Number(item.rate) || 0));
}

export function lineGst(item: LineItem): number {
  const rate = GST_RATES.includes(item.gstRate as (typeof GST_RATES)[number])
    ? item.gstRate
    : 0;
  return money(lineTaxable(item) * (rate / 100));
}

export function lineBreakup(item: LineItem, mode: GstMode) {
  const taxable = lineTaxable(item);
  const gst = lineGst(item);
  if (mode === "intra") {
    const cgst = round2(gst / 2);
    const sgst = round2(gst - cgst);
    return { taxable, cgst, sgst, igst: 0, gst: round2(cgst + sgst) };
  }
  return { taxable, cgst: 0, sgst: 0, igst: gst, gst };
}

export function invoiceTotals(inv: Invoice) {
  const acc = { taxable: 0, cgst: 0, sgst: 0, igst: 0, gst: 0, grand: 0 };
  for (const item of inv.items) {
    const b = lineBreakup(item, inv.gstMode);
    acc.taxable = round2(acc.taxable + b.taxable);
    acc.cgst = round2(acc.cgst + b.cgst);
    acc.sgst = round2(acc.sgst + b.sgst);
    acc.igst = round2(acc.igst + b.igst);
  }
  acc.gst = round2(acc.cgst + acc.sgst + acc.igst);
  acc.grand = round2(acc.taxable + acc.gst);
  return acc;
}

export function isGstinFormat(value: string): boolean {
  return /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][0-9A-Z]Z[0-9A-Z]$/i.test(value.trim());
}

/** GSTIN checksum (CGST Rules). Format-valid demo IDs may still fail this. */
export function gstinChecksumOk(value: string): boolean {
  const gst = value.trim().toUpperCase();
  if (!isGstinFormat(gst)) return false;
  const chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let sum = 0;
  for (let i = 0; i < 14; i++) {
    const code = chars.indexOf(gst[i] ?? "");
    if (code < 0) return false;
    const product = code * (i % 2 === 0 ? 1 : 2);
    sum += Math.floor(product / 36) + (product % 36);
  }
  const check = (36 - (sum % 36)) % 36;
  return chars[check] === gst[14];
}

export function isGstin(value: string): boolean {
  return isGstinFormat(value);
}

export function gstinHint(value: string): string | null {
  const v = value.trim();
  if (!v) return null;
  if (!isGstinFormat(v)) return "Need 15 characters: 2 state digits + PAN + entity + Z + check.";
  if (!gstinChecksumOk(v)) return "Format looks right; checksum does not match a live GSTIN.";
  return null;
}

export function inferGstMode(
  seller: { gstin: string; state: string },
  buyer: { gstin: string; state: string },
): GstMode {
  const a = seller.gstin.trim().slice(0, 2);
  const b = buyer.gstin.trim().slice(0, 2);
  if (/^\d{2}$/.test(a) && /^\d{2}$/.test(b)) return a === b ? "intra" : "inter";
  if (seller.state && buyer.state) return seller.state === buyer.state ? "intra" : "inter";
  return "intra";
}

export function stateFromGstin(gstin: string): string | undefined {
  return STATE_BY_CODE[gstin.trim().slice(0, 2)];
}

export function nextInvoiceNumber(existing: string[], prefixRaw: string): string {
  const year = new Date().getFullYear();
  const prefix = (prefixRaw.replace(/[^A-Za-z0-9]/g, "").slice(0, 8) || "CB").toUpperCase();
  const head = `${prefix}-${year}-`;
  let max = 0;
  for (const n of existing) {
    if (!n.startsWith(head)) continue;
    const num = Number(n.slice(head.length));
    if (Number.isFinite(num) && num > max) max = num;
  }
  return `${head}${String(max + 1).padStart(4, "0")}`;
}
