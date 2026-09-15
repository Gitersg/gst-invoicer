import { format } from "date-fns";
import { invoiceTotals, lineGross, lineTaxable } from "@/lib/gst";
import { formatInr, inrWords } from "@/lib/inr";
import type { Business, Client, Invoice } from "@/lib/types";
import { filled } from "@/lib/utils";

function fmtDate(iso: string) {
  if (!iso) return "";
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return format(d, "dd MMM yyyy");
}

export function InvoiceSheet({
  invoice,
  business,
  clients,
}: {
  invoice: Invoice;
  business: Business;
  clients: Client[];
}) {
  const t = invoiceTotals(invoice);
  const title = business.documentTitle || "Tax Invoice";
  const showGst = title !== "Bill of Supply";
  const print = invoice.print;
  const place = invoice.placeOfSupply || clients[0]?.state || "";
  const showHsn = print.hsn && invoice.items.some((it) => filled(it.hsn));
  const showBank =
    print.bank &&
    (filled(business.bankName) || filled(business.accountNumber) || filled(business.ifsc));
  const showBillFrom = print.billFrom && filled(business.name);
  const showSellerContact =
    print.sellerContact && (filled(business.email) || filled(business.phone));
  const showTaxIds = print.taxIds && (filled(business.gstin) || filled(business.pan));
  const showNotes = print.notes && filled(invoice.notes);
  const showOffer = filled(invoice.offerNote);
  const showFooter = print.footer && filled(business.footerNote);
  const payable = showGst ? t.grand : t.taxable;

  return (
    <article className="invoice-sheet mx-auto w-full max-w-3xl bg-surface p-6 text-fg shadow-[var(--shadow-border)] sm:p-10">
      <header className="flex flex-wrap items-start justify-between gap-6 border-b border-border pb-6">
        <div>
          <p className="font-display text-3xl font-medium tracking-tight text-balance">{business.name}</p>
          {filled(business.address) ? (
            <p className="mt-2 whitespace-pre-line text-sm text-muted text-pretty">{business.address}</p>
          ) : null}
          {showTaxIds ? (
            <p className="mt-2 text-sm">
              {filled(business.gstin) ? (
                <>
                  GSTIN <span className="font-medium tabular-nums">{business.gstin}</span>
                </>
              ) : null}
              {filled(business.gstin) && filled(business.pan) ? " · " : null}
              {filled(business.pan) ? (
                <>
                  PAN <span className="font-medium">{business.pan}</span>
                </>
              ) : null}
            </p>
          ) : null}
        </div>
        <div className="text-right">
          <p className="text-xs font-semibold tracking-[0.2em] text-primary uppercase">{title}</p>
          <p className="mt-1 font-display text-2xl tabular-nums">{invoice.number}</p>
          <p className="mt-2 text-sm text-muted">
            {invoice.date ? <>Date {fmtDate(invoice.date)}</> : null}
            {print.dueDate && invoice.dueDate ? (
              <>
                <br />
                Due {fmtDate(invoice.dueDate)}
              </>
            ) : null}
          </p>
        </div>
      </header>

      <section className="mt-6 grid gap-6 sm:grid-cols-2">
        {showBillFrom ? (
          <div>
            <p className="text-xs font-semibold tracking-wider text-muted uppercase">Bill from</p>
            <p className="mt-1 font-medium">{business.name}</p>
            {showSellerContact && filled(business.email) ? (
              <p className="text-sm text-muted">{business.email}</p>
            ) : null}
            {showSellerContact && filled(business.phone) ? (
              <p className="text-sm text-muted">{business.phone}</p>
            ) : null}
          </div>
        ) : showSellerContact ? (
          <div>
            <p className="text-xs font-semibold tracking-wider text-muted uppercase">Contact</p>
            {filled(business.email) ? <p className="mt-1 text-sm">{business.email}</p> : null}
            {filled(business.phone) ? <p className="text-sm">{business.phone}</p> : null}
          </div>
        ) : (
          <div />
        )}
        <div>
          <p className="text-xs font-semibold tracking-wider text-muted uppercase">
            {clients.length > 1 ? "Bill to · group" : "Bill to"}
          </p>
          {clients.length === 0 ? <p className="mt-1 text-sm text-muted">No client selected</p> : null}
          <div className="mt-1 space-y-3">
            {clients.map((c) => (
              <div key={c.id}>
                <p className="font-medium">{c.name}</p>
                {filled(c.address) ? (
                  <p className="whitespace-pre-line text-sm text-muted">{c.address}</p>
                ) : null}
                {print.taxIds && filled(c.gstin) ? <p className="text-sm">GSTIN {c.gstin}</p> : null}
              </div>
            ))}
          </div>
          {place ? (
            <p className="mt-2 text-sm text-muted">
              Place of supply: {place}
              {showGst ? ` · ${invoice.gstMode === "intra" ? "CGST + SGST" : "IGST"}` : null}
            </p>
          ) : null}
        </div>
      </section>

      <div className="mt-8 overflow-x-auto">
        <table className="w-full min-w-[32rem] text-left text-sm">
          <thead>
            <tr className="border-b border-border text-xs tracking-wider text-muted uppercase">
              <th className="py-2 pr-3 font-medium">#</th>
              <th className="py-2 pr-3 font-medium">Description</th>
              {showHsn ? <th className="py-2 pr-3 font-medium">Tax code</th> : null}
              <th className="py-2 pr-3 text-right font-medium">Qty</th>
              <th className="py-2 pr-3 text-right font-medium">Rate</th>
              {showGst ? <th className="py-2 pr-3 text-right font-medium">GST %</th> : null}
              <th className="py-2 text-right font-medium">Amount</th>
            </tr>
          </thead>
          <tbody>
            {invoice.items.map((item, i) => {
              const gift = item.kind === "gift";
              return (
                <tr key={item.id} className="border-b border-border/70 align-top">
                  <td className="py-3 pr-3 tabular-nums text-muted">{i + 1}</td>
                  <td className="py-3 pr-3 whitespace-pre-wrap text-pretty">
                    {item.description}
                    {gift ? (
                      <span className="mt-1 block text-xs font-semibold tracking-wide text-primary uppercase">
                        Free gift
                      </span>
                    ) : null}
                    {item.lineDiscount > 0 && !gift ? (
                      <span className="mt-1 block text-xs text-muted">
                        Line discount {formatInr(item.lineDiscount)}
                      </span>
                    ) : null}
                  </td>
                  {showHsn ? (
                    <td className="py-3 pr-3 tabular-nums">{filled(item.hsn) ? item.hsn : ""}</td>
                  ) : null}
                  <td className="py-3 pr-3 text-right tabular-nums">{item.qty}</td>
                  <td className="py-3 pr-3 text-right tabular-nums">
                    {gift ? "Free" : formatInr(item.rate)}
                  </td>
                  {showGst ? (
                    <td className="py-3 pr-3 text-right tabular-nums">{gift ? "" : `${item.gstRate}%`}</td>
                  ) : null}
                  <td className="py-3 text-right tabular-nums">
                    {gift ? "Free" : formatInr(lineTaxable(item) || lineGross(item))}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <section className="mt-6 flex flex-col gap-6 sm:flex-row sm:justify-between">
        <div className="max-w-sm text-sm">
          <p className="text-xs font-semibold tracking-wider text-muted uppercase">Amount in words</p>
          <p className="mt-1 text-pretty">{inrWords(payable)}</p>
          {showOffer ? (
            <p className="mt-4 text-pretty">
              <span className="font-medium">Offer. </span>
              {invoice.offerNote}
            </p>
          ) : null}
          {showNotes ? (
            <p className="mt-4 text-pretty text-muted">
              <span className="font-medium text-fg">Notes. </span>
              {invoice.notes}
            </p>
          ) : null}
          {showBank ? (
            <div className="mt-4 text-sm">
              <p className="text-xs font-semibold tracking-wider text-muted uppercase">Bank</p>
              <p className="mt-1">
                {filled(business.bankName) ? (
                  <>
                    {business.bankName}
                    <br />
                  </>
                ) : null}
                {filled(business.accountNumber) ? (
                  <>
                    A/C {business.accountNumber}
                    <br />
                  </>
                ) : null}
                {filled(business.ifsc) ? <>IFSC {business.ifsc}</> : null}
              </p>
            </div>
          ) : null}
        </div>
        <dl className="min-w-[14rem] space-y-2 text-sm">
          <div className="flex justify-between gap-8">
            <dt className="text-muted">Subtotal</dt>
            <dd className="tabular-nums">{formatInr(t.subtotal)}</dd>
          </div>
          {t.discount > 0 ? (
            <div className="flex justify-between gap-8">
              <dt className="text-muted">
                Discount
                {invoice.discountKind === "percent" ? ` (${invoice.discountValue}%)` : ""}
              </dt>
              <dd className="tabular-nums">− {formatInr(t.discount)}</dd>
            </div>
          ) : null}
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
            <dd className="tabular-nums">{formatInr(payable)}</dd>
          </div>
        </dl>
      </section>

      {print.reverseCharge || showFooter ? (
        <footer className="mt-10 border-t border-border pt-4 text-xs text-muted">
          {print.reverseCharge ? <>Reverse charge: {invoice.reverseCharge ? "Yes" : "No"}</> : null}
          {print.reverseCharge && showFooter ? " · " : null}
          {showFooter ? business.footerNote : null}
        </footer>
      ) : null}
    </article>
  );
}
