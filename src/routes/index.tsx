import { createFileRoute } from "@tanstack/react-router";
import { CircleHelp, FilePlus, Printer, RotateCcw, Trash2, X } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { AmountInput, Field, Input, Select, Textarea } from "@/components/field";
import { InvoiceSheet } from "@/components/invoice-sheet";
import {
  DOC_TITLES,
  GST_RATES,
  INDIAN_STATES,
  gstinHint,
  inferGstMode,
  invoiceTotals,
  stateFromGstin,
} from "@/lib/gst";
import { formatInr } from "@/lib/inr";
import { useBill } from "@/lib/store";
import type { Invoice, InvoiceStatus } from "@/lib/types";
import { cn, uid } from "@/lib/utils";

export const Route = createFileRoute("/")({ ssr: false, component: Home });

const STATUS: InvoiceStatus[] = ["draft", "unpaid", "paid"];

function Home() {
  const [tab, setTab] = useState<"invoice" | "preview" | "business">("invoice");
  const [help, setHelp] = useState(false);

  const business = useBill((s) => s.business);
  const clients = useBill((s) => s.clients);
  const invoices = useBill((s) => s.invoices);
  const selectedId = useBill((s) => s.selectedId);
  const invoice = invoices.find((i) => i.id === selectedId) ?? invoices[0];
  const client = clients.find((c) => c.id === invoice?.clientId);

  const stats = useMemo(() => {
    let paid = 0;
    let unpaid = 0;
    for (const inv of invoices) {
      const g = invoiceTotals(inv).grand;
      if (inv.status === "paid") paid += g;
      else if (inv.status !== "draft") unpaid += g;
    }
    return { paid, unpaid, count: invoices.length };
  }, [invoices]);

  function savePdf() {
    setTab("preview");
    window.setTimeout(() => window.print(), 300);
  }

  return (
    <div className="min-h-screen bg-bg text-fg">
      <header className="app-chrome sticky top-0 z-10 border-b border-border/80 bg-bg/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3 px-4 py-3">
          <div className="mr-auto">
            <p className="font-display text-xl font-medium tracking-tight">GST Invoicer</p>
            <p className="text-xs text-muted">Tax invoices · stays on this device</p>
          </div>
          <Button variant="ghost" onClick={() => setHelp(true)} aria-label="How to use">
            <CircleHelp className="size-4" />
            Help
          </Button>
          <Button variant="outline" onClick={() => useBill.getState().createInvoice()}>
            <FilePlus className="size-4" />
            New invoice
          </Button>
          <Button onClick={savePdf} disabled={!invoice}>
            <Printer className="size-4" />
            Print / PDF
          </Button>
        </div>
      </header>

      {help ? <HelpPanel onClose={() => setHelp(false)} /> : null}

      <div className="app-chrome mx-auto grid max-w-7xl gap-6 px-4 py-6 lg:grid-cols-[minmax(0,18rem)_1fr]">
        <aside className="space-y-4">
          <section className="grid grid-cols-3 gap-2 lg:grid-cols-1">
            <Stat label="Collected" value={formatInr(stats.paid)} />
            <Stat label="Outstanding" value={formatInr(stats.unpaid)} />
            <Stat label="Invoices" value={String(stats.count)} />
          </section>
          <nav className="space-y-1">
            {invoices.map((inv) => {
              const c = clients.find((x) => x.id === inv.clientId);
              const total = invoiceTotals(inv).grand;
              const active = inv.id === invoice?.id;
              return (
                <button
                  key={inv.id}
                  type="button"
                  onClick={() => {
                    useBill.getState().select(inv.id);
                    setTab("invoice");
                  }}
                  className={cn(
                    "flex w-full flex-col rounded-xl px-3 py-3 text-left transition-colors duration-150",
                    active ? "bg-surface shadow-[var(--shadow-border)]" : "hover:bg-fg/5",
                  )}
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className="font-medium tabular-nums">{inv.number}</span>
                    <StatusPill status={inv.status} />
                  </span>
                  <span className="mt-1 truncate text-sm text-muted">{c?.name ?? "No client"}</span>
                  <span className="tabular-nums text-sm">{formatInr(total)}</span>
                </button>
              );
            })}
          </nav>
          <Button variant="ghost" className="w-full text-muted" onClick={() => useBill.getState().resetDemo()}>
            <RotateCcw className="size-4" />
            Reset demo data
          </Button>
        </aside>

        <main className="min-w-0 space-y-4">
          <div className="flex flex-wrap gap-2">
            {(
              [
                ["invoice", "Edit"],
                ["preview", "Preview"],
                ["business", "Company"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                className={cn(
                  "h-11 rounded-lg px-4 text-sm font-medium transition-colors duration-150",
                  tab === id ? "bg-primary text-primary-fg" : "bg-surface text-fg shadow-[var(--shadow-border)]",
                )}
              >
                {label}
              </button>
            ))}
          </div>

          {tab === "preview" && invoice ? (
            <div className="flex flex-col gap-3 rounded-xl bg-surface px-4 py-4 shadow-[var(--shadow-border)] sm:flex-row sm:items-center">
              <p className="flex-1 text-sm text-pretty">
                This is only a look at the bill. Click <strong>Print / Save PDF</strong>. A print
                window opens. In that window choose <strong>Save as PDF</strong>, then Save.
              </p>
              <Button onClick={() => window.print()}>
                <Printer className="size-4" />
                Print / Save PDF
              </Button>
            </div>
          ) : null}

          {tab === "invoice" && invoice ? (
            <Editor
              key={invoice.id}
              invoiceId={invoice.id}
              onDelete={() => useBill.getState().removeInvoice(invoice.id)}
            />
          ) : null}

          {tab === "invoice" && !invoice ? (
            <p className="rounded-2xl bg-surface p-8 text-muted shadow-[var(--shadow-border)]">
              No invoices yet. Create one to start billing.
            </p>
          ) : null}

          {tab === "business" ? <Studio /> : null}
        </main>
      </div>

      {invoice ? (
        <div className={cn("mx-auto max-w-7xl px-4 pb-10 print:block", tab !== "preview" && "hidden")}>
          <InvoiceSheet invoice={invoice} business={business} client={client} />
        </div>
      ) : null}
    </div>
  );
}

function HelpPanel({ onClose }: { onClose: () => void }) {
  return (
    <div className="app-chrome fixed inset-0 z-20 flex items-end justify-center bg-fg/40 p-4 sm:items-center">
      <div
        role="dialog"
        aria-labelledby="help-title"
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-surface p-6 text-fg shadow-[var(--shadow-border)]"
      >
        <div className="flex items-start justify-between gap-3">
          <h2 id="help-title" className="font-display text-xl">
            How to use GST Invoicer
          </h2>
          <Button variant="ghost" aria-label="Close help" onClick={onClose}>
            <X className="size-4" />
          </Button>
        </div>
        <ol className="mt-4 list-decimal space-y-3 pl-5 text-sm text-pretty">
          <li>
            Open <strong>Company</strong>. Replace the demo legal name, GSTIN, PAN, bank, and address
            with yours. Document title can be Tax Invoice, Bill, Invoice, Bill of Supply, or Proforma.
          </li>
          <li>
            Edit or add <strong>clients</strong>. Bistro Forty Two and Northline Apparel are fake sample
            buyers so the app is not empty on first open.
          </li>
          <li>
            GST split is automatic from the first two digits of seller vs buyer GSTIN (same state =
            CGST+SGST, other state = IGST). You can override it on the invoice.
          </li>
          <li>
            <strong>PDF</strong> opens Preview, then the browser print dialog. Choose Destination →
            Save as PDF. Nothing is uploaded.
          </li>
          <li>
            All data stays in this browser only. Reset demo data wipes your edits on this device.
          </li>
        </ol>
        <p className="mt-4 text-xs text-muted">
          This helper follows GST invoice maths (Rule 46 style fields). It is not a CA, GSTR-1 filer,
          or e-invoice portal.
        </p>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-surface p-3 shadow-[var(--shadow-border)]">
      <p className="text-xs tracking-wide text-muted uppercase">{label}</p>
      <p className="mt-1 font-medium tabular-nums">{value}</p>
    </div>
  );
}

function StatusPill({ status }: { status: InvoiceStatus }) {
  const label = status === "paid" ? "Paid" : status === "unpaid" ? "Due" : "Draft";
  return (
    <span
      className={cn(
        "rounded-full px-2 py-0.5 text-xs font-semibold tracking-wide uppercase",
        status === "paid" && "bg-primary/10 text-primary",
        status === "unpaid" && "bg-danger/10 text-danger",
        status === "draft" && "bg-fg/5 text-muted",
      )}
    >
      {label}
    </span>
  );
}

function Editor({ invoiceId, onDelete }: { invoiceId: string; onDelete: () => void }) {
  const invoice = useBill((s) => s.invoices.find((i) => i.id === invoiceId));
  const clients = useBill((s) => s.clients);
  const business = useBill((s) => s.business);
  if (!invoice) return null;
  const patch = (p: Partial<Invoice>) => useBill.getState().patchInvoice(invoiceId, p);

  return (
    <div className="space-y-4 rounded-2xl bg-surface p-4 shadow-[var(--shadow-border)] sm:p-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Number">
          <Input value={invoice.number} onChange={(e) => patch({ number: e.target.value })} />
        </Field>
        <Field label="Date">
          <Input type="date" value={invoice.date} onChange={(e) => patch({ date: e.target.value })} />
        </Field>
        <Field label="Due">
          <Input type="date" value={invoice.dueDate} onChange={(e) => patch({ dueDate: e.target.value })} />
        </Field>
        <Field label="Status">
          <Select
            value={invoice.status}
            onChange={(e) => useBill.getState().setStatus(invoiceId, e.target.value as InvoiceStatus)}
          >
            {STATUS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Client" className="sm:col-span-2">
          <Select
            value={invoice.clientId}
            onChange={(e) => {
              const c = clients.find((x) => x.id === e.target.value);
              patch({
                clientId: e.target.value,
                gstMode: c ? inferGstMode(business, c) : "intra",
                placeOfSupply: c?.state ?? "",
              });
            }}
          >
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Place of supply">
          <Select
            value={invoice.placeOfSupply || ""}
            onChange={(e) => patch({ placeOfSupply: e.target.value })}
          >
            <option value="">Select</option>
            {INDIAN_STATES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="GST split">
          <Select
            value={invoice.gstMode}
            onChange={(e) => patch({ gstMode: e.target.value as "intra" | "inter" })}
          >
            <option value="intra">Same state — CGST + SGST</option>
            <option value="inter">Other state — IGST</option>
          </Select>
        </Field>
        <Field label="Reverse charge">
          <Select
            value={invoice.reverseCharge ? "yes" : "no"}
            onChange={(e) => patch({ reverseCharge: e.target.value === "yes" })}
          >
            <option value="no">No</option>
            <option value="yes">Yes</option>
          </Select>
        </Field>
      </div>

      <div className="space-y-3">
        {invoice.items.map((item, idx) => (
          <div key={item.id} className="space-y-2 rounded-xl bg-bg p-3">
            <div className="flex gap-2">
              <Field label={idx === 0 ? "Work" : ""} className="min-w-0 flex-1">
                <Input
                  placeholder="What did you deliver?"
                  value={item.description}
                  onChange={(e) =>
                    useBill.getState().setItem(invoiceId, { ...item, description: e.target.value })
                  }
                />
              </Field>
              <div className="flex shrink-0 items-end">
                <Button
                  variant="ghost"
                  className="w-11 px-0 text-muted"
                  aria-label="Remove line"
                  disabled={invoice.items.length < 2}
                  onClick={() => useBill.getState().removeItem(invoiceId, item.id)}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <Field label={idx === 0 ? "HSN/SAC" : ""}>
                <Input
                  value={item.hsn}
                  onChange={(e) =>
                    useBill.getState().setItem(invoiceId, { ...item, hsn: e.target.value })
                  }
                />
              </Field>
              <Field label={idx === 0 ? "Qty" : ""}>
                <AmountInput
                  value={item.qty}
                  placeholder="1"
                  onCommit={(n) => useBill.getState().setItem(invoiceId, { ...item, qty: n || 1 })}
                />
              </Field>
              <Field label={idx === 0 ? "Rate" : ""}>
                <AmountInput
                  value={item.rate}
                  placeholder="0"
                  onCommit={(n) => useBill.getState().setItem(invoiceId, { ...item, rate: n })}
                />
              </Field>
              <Field label={idx === 0 ? "GST %" : ""}>
                <Select
                  value={String(item.gstRate)}
                  onChange={(e) =>
                    useBill.getState().setItem(invoiceId, { ...item, gstRate: Number(e.target.value) })
                  }
                >
                  {GST_RATES.map((r) => (
                    <option key={r} value={r}>
                      {r}%
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
          </div>
        ))}
        <Button variant="outline" onClick={() => useBill.getState().addItem(invoiceId)}>
          Add line
        </Button>
      </div>

      <Field label="Notes">
        <Textarea value={invoice.notes} onChange={(e) => patch({ notes: e.target.value.slice(0, 2000) })} />
      </Field>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="font-display text-2xl tabular-nums">{formatInr(invoiceTotals(invoice).grand)}</p>
        <Button variant="danger" onClick={onDelete}>
          <Trash2 className="size-4" />
          Delete
        </Button>
      </div>
    </div>
  );
}

function GstHint({ value }: { value: string }) {
  const hint = gstinHint(value);
  if (!hint) return null;
  return <p className="text-xs text-danger">{hint}</p>;
}

function Studio() {
  const business = useBill((s) => s.business);
  const clients = useBill((s) => s.clients);
  const patch = (p: Partial<typeof business>) => useBill.getState().patchBusiness(p);

  return (
    <div className="space-y-6">
      <p className="rounded-xl bg-surface px-4 py-3 text-sm text-muted shadow-[var(--shadow-border)]">
        Demo names (Aarohi Studio, Bistro Forty Two, Northline Apparel) are sample only. Change them
        here — they print on every bill.
      </p>
      <section className="space-y-4 rounded-2xl bg-surface p-4 shadow-[var(--shadow-border)] sm:p-6">
        <h2 className="font-display text-xl">Your company</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Legal name">
            <Input value={business.name} onChange={(e) => patch({ name: e.target.value })} />
          </Field>
          <Field label="Document title">
            <Select
              value={business.documentTitle}
              onChange={(e) => patch({ documentTitle: e.target.value })}
            >
              {DOC_TITLES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Invoice prefix">
            <Input
              value={business.numberPrefix}
              onChange={(e) => patch({ numberPrefix: e.target.value.toUpperCase().slice(0, 8) })}
            />
          </Field>
          <Field label="GSTIN">
            <Input
              value={business.gstin}
              onChange={(e) => {
                const gstin = e.target.value.toUpperCase();
                const state = stateFromGstin(gstin);
                patch(state ? { gstin, state } : { gstin });
              }}
            />
            <GstHint value={business.gstin} />
          </Field>
          <Field label="PAN">
            <Input value={business.pan} onChange={(e) => patch({ pan: e.target.value.toUpperCase() })} />
          </Field>
          <Field label="State">
            <Select value={business.state} onChange={(e) => patch({ state: e.target.value })}>
              {INDIAN_STATES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Address" className="sm:col-span-2">
            <Textarea value={business.address} onChange={(e) => patch({ address: e.target.value })} />
          </Field>
          <Field label="Email">
            <Input type="email" value={business.email} onChange={(e) => patch({ email: e.target.value })} />
          </Field>
          <Field label="Phone">
            <Input value={business.phone} onChange={(e) => patch({ phone: e.target.value })} />
          </Field>
          <Field label="Bank">
            <Input value={business.bankName} onChange={(e) => patch({ bankName: e.target.value })} />
          </Field>
          <Field label="Account">
            <Input value={business.accountNumber} onChange={(e) => patch({ accountNumber: e.target.value })} />
          </Field>
          <Field label="IFSC">
            <Input value={business.ifsc} onChange={(e) => patch({ ifsc: e.target.value.toUpperCase() })} />
          </Field>
          <Field label="Footer line" className="sm:col-span-2">
            <Input
              value={business.footerNote}
              onChange={(e) => patch({ footerNote: e.target.value.slice(0, 240) })}
            />
          </Field>
        </div>
      </section>

      <section className="space-y-4 rounded-2xl bg-surface p-4 shadow-[var(--shadow-border)] sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-display text-xl">Clients</h2>
          <Button
            variant="outline"
            onClick={() =>
              useBill.getState().upsertClient({
                id: uid("cl"),
                name: "New client",
                gstin: "",
                address: "",
                state: business.state,
                email: "",
                phone: "",
              })
            }
          >
            Add client
          </Button>
        </div>
        <div className="space-y-6">
          {clients.map((c) => (
            <div key={c.id} className="grid gap-3 border-t border-border pt-4 sm:grid-cols-2">
              <Field label="Name">
                <Input
                  value={c.name}
                  onChange={(e) => useBill.getState().upsertClient({ ...c, name: e.target.value })}
                />
              </Field>
              <Field label="GSTIN">
                <Input
                  value={c.gstin}
                  onChange={(e) => {
                    const gstin = e.target.value.toUpperCase();
                    const state = stateFromGstin(gstin);
                    useBill.getState().upsertClient({ ...c, gstin, ...(state ? { state } : {}) });
                  }}
                />
                <GstHint value={c.gstin} />
              </Field>
              <Field label="State">
                <Select
                  value={c.state}
                  onChange={(e) => useBill.getState().upsertClient({ ...c, state: e.target.value })}
                >
                  {INDIAN_STATES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Phone">
                <Input
                  value={c.phone}
                  onChange={(e) => useBill.getState().upsertClient({ ...c, phone: e.target.value })}
                />
              </Field>
              <Field label="Email">
                <Input
                  value={c.email}
                  onChange={(e) => useBill.getState().upsertClient({ ...c, email: e.target.value })}
                />
              </Field>
              <Field label="Address" className="sm:col-span-2">
                <Textarea
                  value={c.address}
                  onChange={(e) => useBill.getState().upsertClient({ ...c, address: e.target.value })}
                />
              </Field>
              <Button
                variant="ghost"
                className="justify-self-start text-danger"
                onClick={() => useBill.getState().removeClient(c.id)}
              >
                Remove client
              </Button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
