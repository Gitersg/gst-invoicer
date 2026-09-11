import { create } from "zustand";
import { persist } from "zustand/middleware";
import { inferGstMode, nextInvoiceNumber } from "./gst";
import { SEED } from "./seed";
import type { BillState, Business, Client, Invoice, InvoiceStatus, LineItem } from "./types";
import { uid } from "./utils";

type Actions = {
  select: (id: string | null) => void;
  patchBusiness: (patch: Partial<Business>) => void;
  upsertClient: (client: Client) => void;
  removeClient: (id: string) => void;
  createInvoice: () => void;
  patchInvoice: (id: string, patch: Partial<Invoice>) => void;
  removeInvoice: (id: string) => void;
  setItem: (invoiceId: string, item: LineItem) => void;
  addItem: (invoiceId: string) => void;
  removeItem: (invoiceId: string, itemId: string) => void;
  setStatus: (id: string, status: InvoiceStatus) => void;
  resetDemo: () => void;
};

function normalizeInvoice(inv: Invoice): Invoice {
  return {
    ...inv,
    reverseCharge: inv.reverseCharge ?? false,
    placeOfSupply: inv.placeOfSupply || "",
  };
}

export const useBill = create<BillState & Actions>()(
  persist(
    (set, get) => ({
      ...SEED,
      select: (id) => set({ selectedId: id }),
      patchBusiness: (patch) => set({ business: { ...get().business, ...patch } }),
      upsertClient: (client) =>
        set({
          clients: get().clients.some((c) => c.id === client.id)
            ? get().clients.map((c) => (c.id === client.id ? client : c))
            : [...get().clients, client],
        }),
      removeClient: (id) =>
        set({
          clients: get().clients.filter((c) => c.id !== id),
          invoices: get().invoices.filter((inv) => inv.clientId !== id),
        }),
      createInvoice: () => {
        const number = nextInvoiceNumber(
          get().invoices.map((i) => i.number),
          get().business.numberPrefix || "CB",
        );
        const today = new Date().toISOString().slice(0, 10);
        const due = new Date();
        due.setDate(due.getDate() + 14);
        const firstClient = get().clients[0];
        const gstMode = firstClient
          ? inferGstMode(get().business, firstClient)
          : "intra";
        const invoice: Invoice = {
          id: uid("inv"),
          number,
          date: today,
          dueDate: due.toISOString().slice(0, 10),
          status: "draft",
          clientId: firstClient?.id ?? "",
          gstMode,
          placeOfSupply: firstClient?.state ?? get().business.state,
          reverseCharge: false,
          notes: "Thank you for your business.",
          items: [
            {
              id: uid("li"),
              description: "",
              hsn: "998361",
              qty: 1,
              rate: 0,
              gstRate: 18,
            },
          ],
        };
        set({ invoices: [invoice, ...get().invoices], selectedId: invoice.id });
      },
      patchInvoice: (id, patch) =>
        set({
          invoices: get().invoices.map((inv) => (inv.id === id ? { ...inv, ...patch } : inv)),
        }),
      removeInvoice: (id) => {
        const invoices = get().invoices.filter((inv) => inv.id !== id);
        set({
          invoices,
          selectedId: get().selectedId === id ? (invoices[0]?.id ?? null) : get().selectedId,
        });
      },
      setItem: (invoiceId, item) => {
        const clean: LineItem = {
          ...item,
          description: item.description.slice(0, 500),
          hsn: item.hsn.replace(/[^0-9A-Za-z]/g, "").slice(0, 8),
          qty: Number.isFinite(item.qty) && item.qty > 0 ? item.qty : 0,
          rate: Number.isFinite(item.rate) && item.rate > 0 ? item.rate : 0,
          gstRate: [0, 3, 5, 12, 18, 28].includes(item.gstRate) ? item.gstRate : 18,
        };
        set({
          invoices: get().invoices.map((inv) =>
            inv.id === invoiceId
              ? { ...inv, items: inv.items.map((it) => (it.id === clean.id ? clean : it)) }
              : inv,
          ),
        });
      },
      addItem: (invoiceId) =>
        set({
          invoices: get().invoices.map((inv) =>
            inv.id === invoiceId
              ? {
                  ...inv,
                  items: [
                    ...inv.items,
                    {
                      id: uid("li"),
                      description: "",
                      hsn: "998361",
                      qty: 1,
                      rate: 0,
                      gstRate: 18,
                    },
                  ],
                }
              : inv,
          ),
        }),
      removeItem: (invoiceId, itemId) =>
        set({
          invoices: get().invoices.map((inv) =>
            inv.id === invoiceId
              ? { ...inv, items: inv.items.filter((it) => it.id !== itemId) }
              : inv,
          ),
        }),
      setStatus: (id, status) =>
        set({
          invoices: get().invoices.map((inv) => (inv.id === id ? { ...inv, status } : inv)),
        }),
      resetDemo: () => set({ ...SEED }),
    }),
    {
      name: "clearbill-v1",
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<BillState>;
        return {
          ...current,
          ...p,
          business: { ...current.business, ...p.business },
          clients: p.clients ?? current.clients,
          invoices: (p.invoices ?? current.invoices).map(normalizeInvoice),
          selectedId: p.selectedId ?? current.selectedId,
        };
      },
    },
  ),
);
