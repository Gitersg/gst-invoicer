export type GstMode = "intra" | "inter";
export type InvoiceStatus = "draft" | "unpaid" | "paid";
export type LineKind = "sale" | "gift";
export type DiscountKind = "none" | "percent" | "amount";

export type PrintSectionKey =
  | "bank"
  | "sellerContact"
  | "billFrom"
  | "notes"
  | "reverseCharge"
  | "footer"
  | "dueDate"
  | "taxIds"
  | "hsn";

export type PrintSections = Record<PrintSectionKey, boolean>;

export const DEFAULT_PRINT: PrintSections = {
  bank: true,
  sellerContact: true,
  billFrom: true,
  notes: true,
  reverseCharge: true,
  footer: true,
  dueDate: true,
  taxIds: true,
  hsn: true,
};

export const PRINT_SECTION_META: { key: PrintSectionKey; label: string; hint: string }[] = [
  { key: "bank", label: "Bank details", hint: "Hidden automatically if A/C, IFSC and bank name are empty" },
  { key: "sellerContact", label: "Your email & phone", hint: "Only prints values you actually filled" },
  { key: "billFrom", label: "Bill-from block", hint: "Repeats your company under Bill from" },
  { key: "taxIds", label: "GSTIN & PAN", hint: "Blank IDs never print" },
  { key: "dueDate", label: "Due date", hint: "Hide for cash / same-day bills" },
  { key: "hsn", label: "Tax-code column (HSN/SAC)", hint: "Hide the whole column if you do not use codes" },
  { key: "notes", label: "Notes", hint: "Empty notes never print" },
  { key: "reverseCharge", label: "Reverse-charge line", hint: "Footer GST line" },
  { key: "footer", label: "Footer note", hint: "Company footer sentence" },
];

export type LineItem = {
  id: string;
  description: string;
  hsn: string;
  qty: number;
  rate: number;
  gstRate: number;
  kind: LineKind;
  lineDiscount: number;
};

export type Party = {
  name: string;
  gstin: string;
  address: string;
  state: string;
  email: string;
  phone: string;
};

export type Business = Party & {
  pan: string;
  bankName: string;
  accountNumber: string;
  ifsc: string;
  documentTitle: string;
  numberPrefix: string;
  footerNote: string;
};

export type Client = Party & { id: string };

export type Invoice = {
  id: string;
  number: string;
  date: string;
  dueDate: string;
  status: InvoiceStatus;
  clientId: string;
  clientIds: string[];
  items: LineItem[];
  notes: string;
  gstMode: GstMode;
  placeOfSupply: string;
  reverseCharge: boolean;
  discountKind: DiscountKind;
  discountValue: number;
  offerNote: string;
  print: PrintSections;
};

export type BillState = {
  business: Business;
  clients: Client[];
  invoices: Invoice[];
  selectedId: string | null;
};
