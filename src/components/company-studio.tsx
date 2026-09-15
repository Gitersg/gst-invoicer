import { Plus, Trash2 } from "lucide-react";
import { Field, Input, Select, Textarea } from "@/components/field";
import { Button } from "@/components/ui/button";
import { DOC_TITLES, INDIAN_STATES, gstinHint, stateFromGstin } from "@/lib/gst";
import { useBill } from "@/lib/store";
import type { Client } from "@/lib/types";
import { uid } from "@/lib/utils";

function GstHint({ value }: { value: string }) {
  const hint = gstinHint(value);
  if (!hint) return null;
  return <p className="text-xs text-danger">{hint}</p>;
}

export function CompanyStudio() {
  const business = useBill((s) => s.business);
  const clients = useBill((s) => s.clients);
  const patch = (p: Partial<typeof business>) => useBill.getState().patchBusiness(p);

  function addClient() {
    const client: Client = {
      id: uid("cl"),
      name: "New client",
      gstin: "",
      address: "",
      state: business.state,
      email: "",
      phone: "",
    };
    useBill.getState().upsertClient(client);
  }

  return (
    <div className="space-y-6">
      <p className="rounded-xl bg-surface px-4 py-3 text-sm text-muted shadow-[var(--shadow-border)]">
        Company and bank details are stored on this device. Leave a field blank and it will never
        appear on a printed bill. You can also hide whole blocks per invoice under Edit → Print on
        this bill.
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
            <Input value={business.email} onChange={(e) => patch({ email: e.target.value })} />
          </Field>
          <Field label="Phone">
            <Input value={business.phone} onChange={(e) => patch({ phone: e.target.value })} />
          </Field>
        </div>
      </section>

      <section className="space-y-4 rounded-2xl bg-surface p-4 shadow-[var(--shadow-border)] sm:p-6">
        <h2 className="font-display text-xl">Bank — optional</h2>
        <p className="text-sm text-muted">
          Leave all three empty if you do not want a bank block. Empty labels such as “A/C” or
          “IFSC” will not print.
        </p>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Bank name">
            <Input value={business.bankName} onChange={(e) => patch({ bankName: e.target.value })} />
          </Field>
          <Field label="Account number">
            <Input
              value={business.accountNumber}
              onChange={(e) => patch({ accountNumber: e.target.value })}
            />
          </Field>
          <Field label="IFSC">
            <Input
              value={business.ifsc}
              onChange={(e) => patch({ ifsc: e.target.value.toUpperCase() })}
            />
          </Field>
        </div>
        <Field label="Footer note">
          <Input
            value={business.footerNote}
            onChange={(e) => patch({ footerNote: e.target.value })}
            placeholder="Leave blank to omit"
          />
        </Field>
      </section>

      <section className="space-y-4 rounded-2xl bg-surface p-4 shadow-[var(--shadow-border)] sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-xl">Clients</h2>
          <Button variant="outline" onClick={addClient}>
            <Plus className="size-4" />
            Add client
          </Button>
        </div>
        <div className="space-y-4">
          {clients.map((c) => (
            <ClientCard key={c.id} client={c} />
          ))}
        </div>
      </section>
    </div>
  );
}

function ClientCard({ client }: { client: Client }) {
  const patch = (p: Partial<Client>) => useBill.getState().upsertClient({ ...client, ...p });
  return (
    <div className="space-y-3 rounded-xl bg-bg p-4">
      <div className="flex items-start justify-between gap-2">
        <p className="font-medium">{client.name || "Untitled client"}</p>
        <Button
          variant="ghost"
          className="h-9 w-11 px-0 text-muted"
          aria-label="Remove client"
          onClick={() => useBill.getState().removeClient(client.id)}
        >
          <Trash2 className="size-4" />
        </Button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Name">
          <Input value={client.name} onChange={(e) => patch({ name: e.target.value })} />
        </Field>
        <Field label="GSTIN">
          <Input
            value={client.gstin}
            onChange={(e) => {
              const gstin = e.target.value.toUpperCase();
              const state = stateFromGstin(gstin);
              patch(state ? { gstin, state } : { gstin });
            }}
          />
          <GstHint value={client.gstin} />
        </Field>
        <Field label="State">
          <Select value={client.state} onChange={(e) => patch({ state: e.target.value })}>
            <option value="">Select</option>
            {INDIAN_STATES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Phone">
          <Input value={client.phone} onChange={(e) => patch({ phone: e.target.value })} />
        </Field>
        <Field label="Email">
          <Input value={client.email} onChange={(e) => patch({ email: e.target.value })} />
        </Field>
        <Field label="Address" className="sm:col-span-2">
          <Textarea value={client.address} onChange={(e) => patch({ address: e.target.value })} />
        </Field>
      </div>
    </div>
  );
}
