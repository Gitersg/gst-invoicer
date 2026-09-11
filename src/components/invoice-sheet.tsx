import { format } from "date-fns";
import { invoiceTotals, lineTaxable } from "@/lib/gst";
import { formatInr, inrWords } from "@/lib/inr";
import type { Business, Client, Invoice } from "@/lib/types";

function fmtDate(iso: string) {
  if (!iso) return "—";
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return format(d, "dd MMM yyyy");
}

export function InvoiceSheet({
  invoice,
  business,
  client,
}: {
  invoice: Invoice;
  business: Business;
  client: Client | undefined;
}) {
  const t = invoiceTotals(invoice);
  const title = business.documentTitle || "Tax Invoice";
  const place = invoice.placeOfSupply || client?.state || "—";
  const showGst = title !== "Bill of Supply";
  return (
    <article className="invoice-sheet mx-auto w-full max-w-3xl bg-surface p-6 text-fg shadow-[var(--shadow-border)] sm:p-10">
      <header className="flex flex-wrap items-start justify-between gap-6 border-b border-border pb-6">
        <div>
          <p className="font-display text-3xl font-medium tracking-tight text-balance">{business.name}</p>
          <p className="mt-2 whitespace-pre-line text-sm text-muted text-pretty">{business.address}</p>
          <p className="mt-2 text-sm">
            {business.gstin ? (
              <>
                GSTIN <span className="font-medium tabular-nums">{business.gstin}</span>
              </>
            ) : null}
            {business.pan ? (
              <>
                {business.gstin ? " · " : null}
                PAN <span className="font-medium">{business.pan}</span>
              </>
            ) : null}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs font-semibold tracking-[0.2em] text-primary uppercase">{title}</p>
          <p className="mt-1 font-display text-2xl tabular-nums">{invoice.number}</p>
          <p className="mt-2 text-sm text-muted">
            Date {fmtDate(invoice.date)}
            <br />
            Due {fmtDate(invoice.dueDate)}
          </p>
        </div>
      </header>

      <section className="mt-6 grid gap-6 sm:grid-cols-2">
        <div>
          <p className="text-xs font-semibold tracking-wider text-muted uppercase">Bill from</p>
          <p className="mt-1 font-medium">{business.name}</p>
          <p className="text-sm text-muted">{business.email}</p>
          <p className="text-sm text-muted">{business.phone}</p>
        </div>
        <div>
          <p className="text-xs font-semibold tracking-wider text-muted uppercase">Bill to</p>
          <p className="mt-1 font-medium">{client?.name ?? "Select a client"}</p>
          <p className="whitespace-pre-line text-sm text-muted">{client?.address}</p>
          {client?.gstin ? <p className="text-sm">GSTIN {client.gstin}</p> : null}
          <p className="mt-1 text-sm text-muted">
            Place of supply: {place}
            {showGst ? ` · ${invoice.gstMode === "intra" ? "CGST + SGST" : "IGST"}` : null}
          </p>
        </div>
      </section>

      <div className="mt-8 overflow-x-auto">
        <table className="w-full min-w-[36rem] text-left text-sm">
          <thead>
            <tr className="border-b border-border text-xs tracking-wider text-muted uppercase">
              <th className="py-2 pr-3 font-medium">#</th>
              <th className="py-2 pr-3 font-medium">Description</th>
              <th className="py-2 pr-3 font-medium">HSN/SAC</th>
              <th className="py-2 pr-3 text-right font-medium">Qty</th>
              <th className="py-2 pr-3 text-right font-medium">Rate</th>
              {showGst ? <th className="py-2 pr-3 text-right font-medium">GST %</th> : null}
              <th className="py-2 text-right font-medium">Taxable</th>
            </tr>
          </thead>
          <tbody>
            {invoice.items.map((item, i) => (
              <tr key={item.id} className="border-b border-border/70">
                <td className="py-3 pr-3 tabular-nums text-muted">{i + 1}</td>
                <td className="py-3 pr-3">{item.description || "—"}</td>
                <td className="py-3 pr-3 tabular-nums">{item.hsn}</td>
                <td className="py-3 pr-3 text-right tabular-nums">{item.qty}</td>
                <td className="py-3 pr-3 text-right tabular-nums">{formatInr(item.rate)}</td>
                {showGst ? (
                  <td className="py-3 pr-3 text-right tabular-nums">{item.gstRate}%</td>
                ) : null}
                <td className="py-3 text-right tabular-nums">{formatInr(lineTaxable(item))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <section className="mt-6 flex flex-col gap-6 sm:flex-row sm:justify-between">
        <div className="max-w-sm text-sm">
          <p className="text-xs font-semibold tracking-wider text-muted uppercase">Amount in words</p>
          <p className="mt-1 text-pretty">{inrWords(showGst ? t.grand : t.taxable)}</p>
          {invoice.notes ? (
            <p className="mt-4 text-pretty text-muted">
              <span className="font-medium text-fg">Notes. </span>
              {invoice.notes}
            </p>
          ) : null}
          <div className="mt-4 text-sm">
            <p className="text-xs font-semibold tracking-wider text-muted uppercase">Bank</p>
            <p className="mt-1">
              {business.bankName}
              <br />
              A/C {business.accountNumber}
              <br />
              IFSC {business.ifsc}
            </p>
          </div>
        </div>
        <dl className="min-w-[14rem] space-y-2 text-sm">
          <div className="flex justify-between gap-8">
            <dt className="text-muted">Taxable</dt>
            <dd className="tabular-nums">{formatInr(t.taxable)}</dd>
          </div>
          {showGst && invoice.gstMode === "intra" ? (
            <>
              <div className="flex justify-between gap-8">
                <dt className="text-muted">CGST</dt>
                <dd className="tabular-nums">{formatInr(t.cgst)}</dd>
              </div>
              <div className="flex justify-between gap-8">
                <dt className="text-muted">SGST</dt>
                <dd className="tabular-nums">{formatInr(t.sgst)}</dd>
              </div>
            </>
          ) : null}
          {showGst && invoice.gstMode === "inter" ? (
            <div className="flex justify-between gap-8">
              <dt className="text-muted">IGST</dt>
              <dd className="tabular-nums">{formatInr(t.igst)}</dd>
            </div>
          ) : null}
          <div className="flex justify-between gap-8 border-t border-border pt-2 font-medium">
            <dt>Total</dt>
            <dd className="tabular-nums">{formatInr(showGst ? t.grand : t.taxable)}</dd>
          </div>
        </dl>
      </section>

      <footer className="mt-10 border-t border-border pt-4 text-xs text-muted">
        Reverse charge: {invoice.reverseCharge ? "Yes" : "No"}
        {business.footerNote ? ` · ${business.footerNote}` : null}
      </footer>
    </article>
  );
}
