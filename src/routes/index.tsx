import { createFileRoute } from "@tanstack/react-router";
import { CircleHelp, FilePlus, Printer, RotateCcw, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { CompanyStudio } from "@/components/company-studio";
import { InvoiceEditor } from "@/components/invoice-editor";
import { InvoiceSheet } from "@/components/invoice-sheet";
import { Button } from "@/components/ui/button";
import { invoiceTotals } from "@/lib/gst";
import { formatInr } from "@/lib/inr";
import { useBill } from "@/lib/store";
import type { InvoiceStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({ ssr: false, component: Home });

function Home() {
  const [tab, setTab] = useState<"invoice" | "preview" | "business">("invoice");
  const [help, setHelp] = useState(false);

  const business = useBill((s) => s.business);
  const clients = useBill((s) => s.clients);
  const invoices = useBill((s) => s.invoices);
  const selectedId = useBill((s) => s.selectedId);
  const invoice = invoices.find((i) => i.id === selectedId) ?? invoices[0];
  const billedClients = clients.filter((c) =>
    (invoice?.clientIds?.length ? invoice.clientIds : [invoice?.clientId]).includes(c.id),
  );

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

  useEffect(() => {
    const base = "GST Invoicer";
    function beforePrint() {
      const name = business.name?.trim() || "Invoice";
      const num = invoice?.number?.trim() || "";
      document.title = num ? `${name} ${num}` : name;
    }
    function afterPrint() {
      document.title = base;
    }
    window.addEventListener("beforeprint", beforePrint);
    window.addEventListener("afterprint", afterPrint);
    return () => {
      window.removeEventListener("beforeprint", beforePrint);
      window.removeEventListener("afterprint", afterPrint);
      document.title = base;
    };
  }, [business.name, invoice?.number]);

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
              const names = clients
                .filter((x) => (inv.clientIds?.length ? inv.clientIds : [inv.clientId]).includes(x.id))
                .map((x) => x.name)
                .join(", ");
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
                  <span className="mt-1 truncate text-sm text-muted">{names || "No client"}</span>
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
                This is only a look at the bill. Click <strong>Print / Save PDF</strong>. In the print
                window choose Destination → <strong>Save as PDF</strong>, and turn off “Headers and
                footers” so the browser does not stamp the website name.
              </p>
              <Button onClick={() => window.print()}>
                <Printer className="size-4" />
                Print / Save PDF
              </Button>
            </div>
          ) : null}

          {tab === "invoice" && invoice ? (
            <InvoiceEditor
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

          {tab === "business" ? <CompanyStudio /> : null}
        </main>
      </div>

      {invoice ? (
        <div className={cn("mx-auto max-w-7xl px-4 pb-10 print:block", tab !== "preview" && "hidden")}>
          <InvoiceSheet invoice={invoice} business={business} clients={billedClients} />
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
            How to use
          </h2>
          <Button variant="ghost" aria-label="Close help" onClick={onClose}>
            <X className="size-4" />
          </Button>
        </div>
        <ol className="mt-4 list-decimal space-y-3 pl-5 text-sm text-pretty">
          <li>
            Open <strong>Company</strong>. Fill only what should appear on bills. Blank bank, GSTIN,
            email, or notes are omitted from the PDF — no empty “A/C” or “IFSC” labels.
          </li>
          <li>
            On each invoice, <strong>Print on this bill</strong> lets you hide bank, due date, tax
            codes, reverse charge, or footer even if the company still has that data.
          </li>
          <li>
            Tick several <strong>clients</strong> to make a group bill. GST follows the first client.
          </li>
          <li>
            Line descriptions hold a full paragraph. Tax code (HSN for goods, SAC for services) is
            optional.
          </li>
          <li>
            Add a percent or rupee discount, an offer note, or a free-gift line. Gifts print as Free
            and stay out of tax.
          </li>
          <li>
            <strong>PDF:</strong> Preview → Print / Save PDF → Destination: Save as PDF. Uncheck
            Headers and footers so Chrome does not print the site name.
          </li>
        </ol>
        <p className="mt-4 text-xs text-muted">
          GST maths follow Rule 46 style fields. This is not a CA, GSTR-1 filer, or e-invoice portal.
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
