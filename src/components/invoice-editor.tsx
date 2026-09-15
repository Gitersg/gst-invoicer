import { Gift, Trash2 } from "lucide-react";
import { AmountInput, Field, Input, Select, Textarea } from "@/components/field";
import { Button } from "@/components/ui/button";
import {
  GST_RATES,
  INDIAN_STATES,
  inferGstMode,
  invoiceTotals,
} from "@/lib/gst";
import { formatInr } from "@/lib/inr";
import { useBill } from "@/lib/store";
import type { DiscountKind, Invoice, InvoiceStatus, PrintSectionKey } from "@/lib/types";
import { PRINT_SECTION_META } from "@/lib/types";
import { cn } from "@/lib/utils";

const STATUS: InvoiceStatus[] = ["draft", "unpaid", "paid"];

export function InvoiceEditor({
  invoiceId,
  onDelete,
}: {
  invoiceId: string;
  onDelete: () => void;
}) {
  const invoice = useBill((s) => s.invoices.find((i) => i.id === invoiceId));
  const clients = useBill((s) => s.clients);
  const business = useBill((s) => s.business);
  if (!invoice) return null;
  const current = invoice;
  const patch = (p: Partial<Invoice>) => useBill.getState().patchInvoice(invoiceId, p);
  const billed = current.clientIds?.length ? current.clientIds : [current.clientId];
  const selected = new Set(billed);
  const mixedStates =
    new Set(clients.filter((c) => selected.has(c.id) && c.state).map((c) => c.state)).size > 1;
  const totals = invoiceTotals(current);

  function toggleClient(id: string) {
    const next = selected.has(id)
      ? [...selected].filter((x) => x !== id)
      : [...selected, id];
    const primary = clients.find((c) => c.id === next[0]);
    patch({
      clientIds: next,
      clientId: next[0] ?? "",
      gstMode: primary ? inferGstMode(business, primary) : current.gstMode,
      placeOfSupply: primary?.state ?? current.placeOfSupply,
    });
  }

  return (
    <div className="space-y-5 rounded-2xl bg-surface p-4 shadow-[var(--shadow-border)] sm:p-6">
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
        <Field label="Place of supply" className="sm:col-span-2">
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
        <Field label="GST split" className="sm:col-span-2">
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

      <section>
        <p className="text-xs font-medium tracking-wide text-muted uppercase">Clients on this bill</p>
        <p className="mt-1 text-xs text-muted">
          Tick more than one for a group bill. GST split follows the first ticked client.
        </p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {clients.map((c) => {
            const on = selected.has(c.id);
            return (
              <label
                key={c.id}
                className={cn(
                  "flex cursor-pointer items-start gap-3 rounded-xl px-3 py-3 text-sm shadow-[var(--shadow-border)]",
                  on ? "bg-bg" : "bg-surface",
                )}
              >
                <input
                  type="checkbox"
                  className="mt-1 size-4 accent-primary"
                  checked={on}
                  onChange={() => toggleClient(c.id)}
                />
                <span>
                  <span className="block font-medium">{c.name}</span>
                  <span className="text-xs text-muted">{c.state || "No state"}</span>
                </span>
              </label>
            );
          })}
        </div>
        {mixedStates ? (
          <p className="mt-2 text-xs text-danger">
            Group mixes states. Place of supply and GST split still use the first client — confirm with your CA.
          </p>
        ) : null}
      </section>

      <div className="space-y-3">
        {invoice.items.map((item, idx) => (
          <div key={item.id} className="space-y-2 rounded-xl bg-bg p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-medium tracking-wide text-muted uppercase">
                {item.kind === "gift" ? "Free gift" : `Line ${idx + 1}`}
              </p>
              <Button
                variant="ghost"
                className="h-9 w-11 px-0 text-muted"
                aria-label="Remove line"
                disabled={invoice.items.length < 2}
                onClick={() => useBill.getState().removeItem(invoiceId, item.id)}
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
            <Field
              label="What you sold / delivered"
              hint="Write the full brief. This prints as a paragraph, not a one-line title."
            >
              <Textarea
                rows={4}
                maxLength={2000}
                placeholder="Describe the work in as much detail as the client should see on the bill."
                value={item.description}
                onChange={(e) =>
                  useBill.getState().setItem(invoiceId, { ...item, description: e.target.value })
                }
              />
              <span className="mt-1 block text-right text-xs text-muted">
                {item.description.length}/2000
              </span>
            </Field>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
              <Field
                label="Tax code"
                hint="HSN (goods) or SAC (services). Optional. 4–8 digits."
                className="sm:col-span-1"
              >
                <Input
                  placeholder="e.g. 998361"
                  value={item.hsn}
                  onChange={(e) =>
                    useBill.getState().setItem(invoiceId, { ...item, hsn: e.target.value })
                  }
                />
              </Field>
              <Field label="Qty">
                <AmountInput
                  value={item.qty}
                  placeholder="1"
                  onCommit={(n) => useBill.getState().setItem(invoiceId, { ...item, qty: n || 1 })}
                />
              </Field>
              <Field label={item.kind === "gift" ? "Rate (ignored)" : "Rate ₹"}>
                <AmountInput
                  value={item.rate}
                  placeholder="0"
                  onCommit={(n) => useBill.getState().setItem(invoiceId, { ...item, rate: n })}
                />
              </Field>
              <Field label="Line discount ₹">
                <AmountInput
                  value={item.lineDiscount}
                  placeholder="0"
                  onCommit={(n) => useBill.getState().setItem(invoiceId, { ...item, lineDiscount: n })}
                />
              </Field>
              <Field label="GST %">
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
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="size-4 accent-primary"
                checked={item.kind === "gift"}
                onChange={(e) =>
                  useBill.getState().setItem(invoiceId, {
                    ...item,
                    kind: e.target.checked ? "gift" : "sale",
                    gstRate: e.target.checked ? 0 : item.gstRate || 18,
                    rate: e.target.checked ? 0 : item.rate,
                  })
                }
              />
              Mark as free gift (prints Free, ₹0, no tax)
            </label>
          </div>
        ))}
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => useBill.getState().addItem(invoiceId, "sale")}>
            Add line
          </Button>
          <Button variant="outline" onClick={() => useBill.getState().addItem(invoiceId, "gift")}>
            <Gift className="size-4" />
            Add free gift
          </Button>
        </div>
      </div>

      <section className="grid gap-4 sm:grid-cols-3">
        <Field label="Bill discount">
          <Select
            value={invoice.discountKind}
            onChange={(e) => patch({ discountKind: e.target.value as DiscountKind })}
          >
            <option value="none">None</option>
            <option value="percent">Percent %</option>
            <option value="amount">Flat rupees</option>
          </Select>
        </Field>
        <Field label={invoice.discountKind === "percent" ? "Discount %" : "Discount ₹"}>
          <AmountInput
            value={invoice.discountValue}
            onCommit={(n) => patch({ discountValue: n })}
          />
        </Field>
        <div className="flex items-end">
          <p className="text-sm text-muted">
            After discount GST is recalculated on the reduced taxable value.
          </p>
        </div>
        <Field
          label="Offer / scheme note"
          hint="Prints only if you type something. Example: Launch week complimentary stickers."
          className="sm:col-span-3"
        >
          <Input
            maxLength={400}
            placeholder="Optional offer text printed on the bill"
            value={invoice.offerNote}
            onChange={(e) => patch({ offerNote: e.target.value.slice(0, 400) })}
          />
        </Field>
      </section>

      <Field label="Notes" hint="Left blank? The notes block is omitted from the print.">
        <Textarea
          value={invoice.notes}
          onChange={(e) => patch({ notes: e.target.value.slice(0, 2000) })}
        />
      </Field>

      <section>
        <p className="text-xs font-medium tracking-wide text-muted uppercase">Print on this bill</p>
        <p className="mt-1 text-xs text-muted">
          Untick a block to drop it from PDF even if company data exists. Empty fields never print anyway.
        </p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {PRINT_SECTION_META.map((row) => (
            <label key={row.key} className="flex cursor-pointer items-start gap-3 rounded-xl bg-bg px-3 py-3">
              <input
                type="checkbox"
                className="mt-1 size-4 accent-primary"
                checked={invoice.print[row.key as PrintSectionKey]}
                onChange={(e) =>
                  useBill.getState().setPrint(invoiceId, row.key as PrintSectionKey, e.target.checked)
                }
              />
              <span>
                <span className="block text-sm font-medium">{row.label}</span>
                <span className="text-xs text-muted">{row.hint}</span>
              </span>
            </label>
          ))}
        </div>
      </section>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs tracking-wide text-muted uppercase">Payable</p>
          <p className="font-display text-2xl tabular-nums">{formatInr(totals.grand)}</p>
          {totals.discount > 0 ? (
            <p className="text-xs text-muted">Includes discount {formatInr(totals.discount)}</p>
          ) : null}
        </div>
        <Button variant="danger" onClick={onDelete}>
          <Trash2 className="size-4" />
          Delete
        </Button>
      </div>
    </div>
  );
}
