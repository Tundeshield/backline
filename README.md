# Backline

**Run your business. We'll handle the back office.** Backline is the back office for growing Nigerian businesses: invoicing, bookkeeping, tax, payroll and business follow-ups, handled together, with an accountant checking the work.

| Module | What it does |
|---|---|
| **Invoicing & e-invoicing** | Create invoices, clear them on the NRS e-invoicing platform (MBS) to get an IRN, CSID and QR code, send by email/WhatsApp, credit notes, mark paid → ledger. |
| **Bookkeeping** | Import bank / mobile-money statements (CSV), auto-categorise, confirm, monthly P&L and cash flow. |
| **VAT & tax prep** | Output vs recoverable input VAT, including fixed assets and overheads (Nigeria Tax Act 2025). Flags receipts that would lose their VAT (no supplier TIN / no tax invoice). VAT schedule export, filing calendar, CIT estimate (small company 0%, 30% + 4% development levy otherwise). |
| **Payroll & PAYE** | NTA 2025 bands (₦800k at 0% → 25% above ₦50m), rent relief (20% of rent, max ₦500k), 8% / 10% pension, NHF. Payslip explainer, payroll runs, bank / PAYE / pension schedules. |
| **Agent inbox** | WhatsApp + email in one inbox. Agent drafts replies (Claude, or rules fallback), offers booking slots, chases overdue invoices with escalating copy. |
| **Accountant review** | Monthly close checklist with Backline's automatic checks, accountant view to tick off and sign off. Premium tier feature. |

Pricing tiers by invoice volume (Starter → Growth → Business → **Compliance-Plus** for medium firms already under the e-invoicing mandate).

## Brand

- **Palette:** warm paper `#F5F0E7`, deep ink `#172231`, terracotta `#9C4938` (sparing accent), muted sand `#D9CBB7` (borders). Green is reserved for success / positive figures.
- **Type:** Newsreader (headlines), Manrope (body), IBM Plex Mono (figures). Type scale classes `t-hero`, `t-section`, `t-card`, `t-lead`, `eyebrow` in `src/index.css`.
- **Mark:** a B built from the "back line" (terracotta stroke) and two ledger bars — `src/components/Logo.jsx`, `public/favicon.svg`.
- **Motif:** a single vertical line connecting the work (hero timeline, services spine).

## Stack

- **React 18 + Vite + Tailwind v4** (SPA, React Router)
- **Firebase** Auth + Firestore (`firestore.rules` scopes all data under `businesses/{bizId}`; accountants get read access plus write on `reviews`)
- **Netlify** hosting + Functions (`netlify/functions`, exposed at `/api/*`)
  - `einvoice-submit` — validates, standardises to the MBS schema and transmits via an Access Point Provider (`EINVOICE_MODE=sandbox|live`)
  - `agent` — AI replies with Claude (`ANTHROPIC_API_KEY`), rules fallback
  - `whatsapp-webhook` — WhatsApp Cloud API verify + auto-reply
  - `send-email` — Resend

**Demo mode:** with no `VITE_FIREBASE_*` keys the app runs fully in the browser (localStorage) with a seeded medium-sized business, so the deployed site works before Firebase is set up.

## Run locally

```bash
npm install
cp .env.example .env    # optional: fill Firebase keys
npm run dev             # app only (functions fall back to in-browser logic)
npx netlify dev         # app + functions
npm test                # tax engine tests (PAYE bands, VAT, e-invoice payload)
```

## Go live checklist

1. **Firebase** — create a project, enable Email/Password + Google sign-in and Firestore. Add the web app config as `VITE_FIREBASE_*` environment variables in Netlify, then `firebase deploy --only firestore:rules`. Add the Netlify domain to Firebase Auth → Authorized domains.
2. **E-invoicing** — onboard with an NRS-accredited Access Point Provider, set `EINVOICE_MODE=live`, `APP_BASE_URL`, `APP_API_KEY`, `APP_API_SECRET`, and map the provider's exact request/response in `netlify/functions/einvoice-submit.mjs` (`toProvider` / `fromProvider`). Save the MBS business ID in Settings.
3. **Agent** — `ANTHROPIC_API_KEY`; for WhatsApp, `WHATSAPP_VERIFY_TOKEN`, `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID` and point Meta's webhook at `/api/whatsapp-webhook`.
4. **Email** — `RESEND_API_KEY`, `EMAIL_FROM`.

## Roadmap

- Paystack subscription billing per plan
- Live bank feeds (Mono / Okra) and mobile-money APIs
- Server-side WhatsApp conversation storage (firebase-admin) and scheduled invoice chasers (Netlify scheduled functions)
- Receipt OCR (photo → supplier, TIN, VAT)
- Accountant portal across multiple client businesses

> Tax figures are estimates prepared for review by a qualified accountant, not tax advice.
