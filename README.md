# GST Invoicer

Tax invoices for Indian businesses. Runs in the browser. Data stays on **this device** — no account, no upload.

Demo names (**Aarohi Studio**, **Bistro Forty Two**, **Northline Apparel**) are fake so the first screen is not empty. Replace them before you send a real bill.

---

## How to use

### 1. Put your company on the bill

Open the **Company** tab.

| Field | What to type |
|---|---|
| Legal name | Your registered / trade name (replaces Aarohi Studio) |
| Document title | **Tax Invoice** (registered taxable supply), **Bill**, **Invoice**, **Bill of Supply** (composition / exempt), or **Proforma Invoice** |
| Invoice prefix | Letters used in numbers, e.g. `CB` → `CB-2026-0004` |
| GSTIN / PAN / State / Address | Yours |
| Bank / IFSC / Account | Printed on the bill for NEFT |
| Footer | Extra line under reverse charge |

GSTIN: 15 characters. The app checks **format** and **checksum**. Demo GSTINs will warn that checksum does not match a live GSTIN — that is expected.

### 2. Clients

Same **Company** tab, lower half.

- **Bistro Forty Two** = sample Kolkata buyer (same state → CGST + SGST).
- **Northline Apparel** = sample Mumbai buyer (other state → IGST).

Rename, edit GSTIN, or **Remove client** and **Add client**.

### 3. Make / edit an invoice

- **New invoice** in the header.
- Sidebar: click a number to open it.
- Edit number, date, due, status (draft / unpaid / paid), client, place of supply, GST split, reverse charge, line items, notes.
- GST split auto-fills from seller vs buyer GSTIN (first two digits = state). You can override.

### 4. Save as PDF

There is **no file-download server**. The **PDF** button opens Preview, then the **browser print dialog**.

1. Select the invoice in the list.
2. Click **PDF**.
3. In the dialog set **Destination → Save as PDF** (Chrome / Edge). Firefox: Print to file / PDF.
4. Click **Save**.

On a phone, use Share / Save as PDF if the browser offers it. Cancel the dialog if you only wanted to look.

**Help** in the header repeats this.

### 5. Reset

**Reset demo data** wipes **your** company, clients, and invoices on this browser and puts the sample set back. Do not click it after you have typed real data.

---

## GST maths (what the app does)

This follows common **CGST Act / Rule 46-style** invoice maths. It is **not** the GST portal, e-invoice (IRP), or GSTR-1.

| Case | Tax |
|---|---|
| Seller and buyer **same state** (GSTIN first 2 digits match, else state names) | **CGST + SGST** (half of the line GST each; paise rounded per line then summed) |
| **Other state** | **IGST** (full line GST) |
| Slabs | 0, 3, 5, 12, 18, 28% |
| Place of supply | Defaults to buyer state; editable |
| Reverse charge | Printed Yes / No only — does not auto-compute RCM tax |
| Bill of Supply | Hides GST % and CGST/SGST/IGST (use for composition / exempt) |
| Amount in words | Indian crore / lakh, rupees and paise |

HSN/SAC is typed by you (e.g. 998361 advertising, 998364 video). The app does not look up HSN.

**Not covered:** e-way bill, e-invoice IRN/QR, GSTR returns, TDS/TCS, export with LUT, ISD, unique quantity rules per HSN. Confirm live bills with a CA.

---

## Security

| Topic | Status |
|---|---|
| Server / login / database | None. Nothing is posted to an API. |
| XSS | Invoice text is React text nodes, not HTML. Notes cannot run scripts. |
| Amounts | Qty, rate, GST % are clamped (finite, non-negative, capped). |
| Secrets | GSTIN, PAN, bank sit in **browser `localStorage`** (`clearbill-v1`). Unencrypted. Anyone with this device/profile can read them. Do not use a shared/public PC for real bank details. |
| Reset | Local wipe only. |
| Checksum | Format/checksum hints only — not authentication with GSTN. |

This is appropriate for a **local tool**. It is not a multi-user SaaS vault.

---

## Performance

Fine for normal freelance volume (tens / low hundreds of invoices). Each keystroke saves the whole ledger to `localStorage`. Thousands of line items would feel heavy; that is out of scope. No network after the first page load except Google Fonts.

---

## Stack

React 19, TanStack Start, Tailwind CSS v4, Zustand persist, date-fns, Lucide.

## Run locally

```bash
git clone https://github.com/Gitersg/gst-invoicer.git
cd gst-invoicer
npm install
npm run dev
```

---

## License

MIT
