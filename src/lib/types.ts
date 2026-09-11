export type GstMode = "intra" | "inter";
export type InvoiceStatus = "draft" | "unpaid" | "paid";

export type LineItem = {
  id: string;
  description: string;
  hsn: string;
  qty: number;
  rate: number;
  gstRate: number;
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
  items: LineItem[];
  notes: string;
  gstMode: GstMode;
  placeOfSupply: string;
  reverseCharge: boolean;
};

export type BillState = {
  business: Business;
  clients: Client[];
  invoices: Invoice[];
  selectedId: string | null;
};
