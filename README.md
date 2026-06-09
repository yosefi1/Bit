# Apartment Electricity Manager

A modern, full-stack web app for managing electricity payments across rental
apartments. Each billing cycle is opened by the administrator with the total
electricity bill + master meter readings; the system derives the per-kWh rate
automatically. Tenants snap a photo of their meter, the app reads the value
with OCR, calculates the amount due, and offers a "Pay with Bit" workflow.

Built with **Next.js 15 · TypeScript · Tailwind · Prisma · NextAuth ·
Tesseract.js**. Runs locally on SQLite out of the box and is one env-var swap
away from being deployed to **Vercel + PostgreSQL** (Supabase / Neon / etc.).

---

## Table of contents

1. [Features](#features)
2. [Architecture](#architecture)
3. [Quick start (local)](#quick-start-local)
4. [Sample credentials](#sample-credentials)
5. [How the rate calculation works](#how-the-rate-calculation-works)
6. [OCR](#ocr)
7. [Bit payment integration](#bit-payment-integration)
8. [Project structure](#project-structure)
9. [Deploying to Vercel + Postgres](#deploying-to-vercel--postgres)
10. [Adding water / gas / maintenance later](#adding-water--gas--maintenance-later)
11. [Available npm scripts](#available-npm-scripts)
12. [Roadmap](#roadmap)

---

## Features

### Tenant
- Username + password login (their own apartment only).
- Dashboard with current rate, previous reading, last bill, status.
- Take or upload a meter photo → automatic OCR → editable confirmed value.
- Live calculation summary (consumption × rate).
- "Pay with Bit" panel with one-tap copy of phone, amount, and reference.
- Mark a payment as sent (admin can verify).
- Submission history.

### Administrator
- Full CRUD on apartments and tenants (incl. credential reset).
- Open a billing cycle by entering **total bill** + **master meter readings**;
  the rate per kWh is calculated automatically and used for every submission
  in that cycle.
- Review every submission: approve, reject, edit reading, change the
  attached photo, add comments.
- Payment status workflow (`PENDING → PAID / CANCELLED`).
- Reports: per-cycle totals, consumption matrix, outstanding balances.
- App-wide settings (Bit recipient phone / name / instructions).
- Audit log of all important actions.

### System
- Role-based middleware-enforced routing.
- Per-cycle snapshot of `ratePerKwh` and `previousReading` on every
  submission (so historical figures are immutable even if a cycle is later
  edited).
- Pluggable storage (local FS today, Vercel Blob / S3 trivially next).
- Pluggable notifications (no-op today, ready for Resend / SES / Twilio).
- Pluggable OCR (Tesseract.js by default, GPT-4o-mini Vision when
  `OPENAI_API_KEY` is set).
- Extensible `UtilityType` enum (`ELECTRICITY` / `WATER` / `GAS` /
  `MAINTENANCE`) so v2 doesn't need a schema rewrite.

---

## Architecture

```
┌────────────────────────────────────────────────────────────┐
│ Next.js App Router (one process: API + UI)                 │
│                                                            │
│ ┌── pages ────────────┐   ┌── route handlers ───────────┐  │
│ │ /login              │   │ /api/auth/[...nextauth]      │  │
│ │ /admin/* (ADMIN)    │   │ /api/apartments              │  │
│ │ /dashboard/*(TENANT)│   │ /api/cycles                  │  │
│ └─────────────────────┘   │ /api/submissions             │  │
│                            │ /api/payments               │  │
│  NextAuth Credentials      │ /api/upload   (multipart)   │  │
│  middleware.ts (RBAC)      │ /api/settings/bit           │  │
│                            └──────────────────────────────┘  │
│                                                            │
│ Prisma ─────────────────────────────────────────────────┐  │
│   User, Apartment, BillingCycle, Submission, Payment,   │  │
│   AppSetting, AuditLog                                  │  │
│ ───────────────────────────────────────────────────────┘   │
│        │                                                   │
│        ▼                                                   │
│   SQLite (local) / PostgreSQL (prod)                       │
└────────────────────────────────────────────────────────────┘
```

---

## Quick start (local)

Requirements: Node.js ≥ 18 (we tested on 22).

```bash
# 1. Install dependencies
npm install

# 2. Set up environment
cp .env.example .env       # On Windows PowerShell: Copy-Item .env.example .env
# Edit .env if you want different defaults (works as-is for local dev).

# 3. Create the database & seed sample data
npm run db:push            # Creates prisma/dev.db (SQLite) from the schema
npm run db:seed            # Adds admin + 4 apartments + 3 tenants + 1 cycle + 3 submissions

# 4. Start the dev server
npm run dev
```

Open <http://localhost:3000> and sign in with one of the seeded users below.

---

## Sample credentials

| Role | Username | Password | Notes |
|------|----------|----------|-------|
| Admin | `admin` | `admin123` | Full system access |
| Tenant — Apt 1A | `alice` | `tenant123` | Submission already approved + paid |
| Tenant — Apt 1B | `boaz` | `tenant123` | Approved, payment pending (try paying!) |
| Tenant — Apt 2A | `chen` | `tenant123` | Submission awaiting admin review |
| (unassigned) | — | — | Apt 2B has no tenant — try assigning one from the admin UI |

> Change `SEED_ADMIN_PASSWORD` in `.env` and re-seed to set your own admin
> credentials.

---

## How the rate calculation works

When an administrator opens a billing cycle they enter three things:

| Field | Example |
|---|---|
| Total electricity bill | `₪ 1,760.00` |
| Master meter — previous | `45,200 kWh` |
| Master meter — current | `48,400 kWh` |

The system then derives, and persists on the cycle:

```
totalConsumption = masterMeterCurrent − masterMeterPrevious   →   3,200 kWh
ratePerKwh       = totalBillAmount / totalConsumption          →   ₪ 0.55 / kWh
```

Every tenant submission inside that cycle uses this rate:

```
previousReading  ← last APPROVED submission for that apartment
                    (or apartment.initialMeterReading if first ever)
consumption      = confirmedReading − previousReading
amountDue        = consumption × ratePerKwh
```

Both `ratePerKwh` and `previousReading` are **snapshotted** on the
`Submission` record. Editing a cycle later does *not* mutate historical
charges — it only affects new submissions.

---

## OCR

When a tenant uploads a meter photo to `POST /api/upload`:

1. The image is saved (default: `/public/uploads/meters/<random>.jpg`).
2. **OpenAI Vision** (`gpt-4o-mini`) is tried first **if** `OPENAI_API_KEY` is
   set — it's significantly more accurate on real-world meter glare.
3. **Tesseract.js** runs as either a fallback or the primary engine
   (digit-whitelist mode for sharp meter glyphs).
4. The endpoint returns `{ reading, confidence, rawText, provider }`.
5. The UI pre-fills the editable "Confirmed reading" field; the tenant
   accepts or corrects it.

The **tenant-confirmed value is always authoritative** for the calculation.
The OCR output, confidence, and provider are stored on the submission for
auditing.

If OCR fails entirely, a warning banner appears and manual entry is
required — submissions where `currentReading < previousReading` are
rejected with a clear validation error.

---

## Bit payment integration

Bit (Israel's P2P payment app) does not currently expose a public
deep-link spec for pre-filling amounts. We support the next best thing:

- A "Pay with Bit" panel that shows **amount**, **phone**, **recipient
  name**, and **reference (apartment name)**, each with a one-tap copy button.
- A "Open Bit / Dial" button that fires a `tel:` URL on mobile (jumps to
  the dialer where the user can hand the number to Bit).
- A clear instruction panel (editable by the admin in **Settings → Bit
  payment**).
- An "I sent the payment" button that flips the payment to `PAID` —
  visible to the admin for final verification.

If Bit later publishes an official deep-link spec, only `src/lib/bit.ts`
needs to change.

---

## Project structure

```
.
├── prisma/
│   ├── schema.prisma          # Database schema (User, Apartment, BillingCycle, ...)
│   ├── seed.ts                # `npm run db:seed`
│   └── dev.db                 # SQLite file (gitignored)
├── public/uploads/            # Meter photos (gitignored)
├── src/
│   ├── app/
│   │   ├── api/               # Route handlers (REST-ish JSON API)
│   │   │   ├── auth/[...nextauth]/
│   │   │   ├── apartments/[id]/(tenant)
│   │   │   ├── cycles/[id]/
│   │   │   ├── submissions/[id]/
│   │   │   ├── payments/[submissionId]/
│   │   │   ├── upload/        # multipart + OCR
│   │   │   └── settings/bit/
│   │   ├── login/             # Sign-in page
│   │   ├── admin/             # ADMIN section (layout-gated)
│   │   │   ├── apartments/    # CRUD
│   │   │   ├── cycles/        # Open/close + rate calculation
│   │   │   ├── submissions/   # Review, approve, reject
│   │   │   ├── reports/       # Monthly + outstanding balances
│   │   │   ├── settings/      # Bit recipient settings
│   │   │   └── audit/         # Audit log viewer
│   │   └── dashboard/         # TENANT section
│   │       ├── submit/        # OCR upload + submit flow
│   │       ├── submission/[id]# Detail + Pay with Bit
│   │       └── history/
│   ├── components/
│   │   ├── ui/                # Button, Card, Input, Table, Badge, Alert
│   │   └── shared/            # Topbar, PageHeader
│   ├── lib/
│   │   ├── auth.ts            # NextAuth config (Credentials)
│   │   ├── session.ts         # require{Page,API}{Session,Admin,Tenant} helpers
│   │   ├── prisma.ts          # Cached Prisma client
│   │   ├── billing.ts         # Rate & consumption math (single source of truth)
│   │   ├── ocr.ts             # OpenAI Vision → Tesseract fallback
│   │   ├── storage.ts         # Local FS now; Vercel Blob stub
│   │   ├── bit.ts             # Bit deep-link helper + settings I/O
│   │   ├── notifications.ts   # No-op adapter, ready for email/SMS
│   │   ├── audit.ts           # writeAuditLog()
│   │   ├── validators.ts      # Zod input schemas for every endpoint
│   │   ├── api.ts             # ApiError + errorResponse helpers
│   │   └── utils.ts           # cn, formatCurrency, formatKwh, round2
│   ├── middleware.ts          # withAuth + role gating
│   └── types/next-auth.d.ts   # Augments Session with role + apartmentId
├── .env.example
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
└── README.md
```

---

## Deploying to Vercel + Postgres

### 1. Switch the Prisma datasource to PostgreSQL

In `prisma/schema.prisma`:

```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}
```

### 2. Set up your Postgres database

Create a Postgres database on **Supabase**, **Neon**, **Vercel Postgres**, or
any other provider. You'll get two connection strings:

- A **pooled** connection (port 6543 on Supabase, ends in `.pooler` on Neon) —
  this goes in `DATABASE_URL`.
- A **direct** connection (port 5432) — this goes in `DIRECT_URL` (used by
  Prisma during migrations).

### 3. Configure Vercel environment variables

In the Vercel project settings, add:

| Name | Example value |
|---|---|
| `DATABASE_URL` | `postgresql://user:pass@host:6543/db?pgbouncer=true&connection_limit=1` |
| `DIRECT_URL` | `postgresql://user:pass@host:5432/db` |
| `NEXTAUTH_SECRET` | Output of `openssl rand -base64 32` |
| `NEXTAUTH_URL` | `https://your-app.vercel.app` |
| `BIT_PHONE` | Your Bit phone number |
| `BIT_RECIPIENT_NAME` | Your name as it appears on Bit |
| `STORAGE_DRIVER` | `vercel-blob` (recommended) or `local` |
| `BLOB_READ_WRITE_TOKEN` | From the Vercel Blob dashboard (if using blob) |
| `OPENAI_API_KEY` | *(optional)* enables GPT-4o-mini Vision OCR |
| `SEED_ADMIN_USERNAME` / `SEED_ADMIN_PASSWORD` | *(optional)* used by `npm run db:seed` |

### 4. Enable Vercel Blob (recommended)

The default `local` storage driver writes to `/public/uploads` — fine for
local dev, but Vercel's filesystem is **ephemeral** and read-only at runtime.
Install Vercel Blob:

```bash
npm install @vercel/blob
```

Then uncomment the `vercel-blob` branch in `src/lib/storage.ts` (it's
already stubbed). Set `STORAGE_DRIVER=vercel-blob`.

### 5. Apply the schema in production

The build step (`npm run build`) only runs `prisma generate`. To **apply
the schema** in production, either:

- **Easy path:** Run `npx prisma db push` locally with the production
  `DATABASE_URL` exported in your shell. This creates all tables.
- **Recommended path:** Switch to proper migrations:

  ```bash
  npm run db:migrate -- --name init   # creates prisma/migrations/<...>
  ```

  Commit the generated migration files, then update Vercel's build command to:

  ```
  prisma migrate deploy && next build
  ```

  (Set this in *Project Settings → Build & Development Settings → Build
  Command*.)

### 6. Seed the production admin

After the schema is applied, run the seed once against production:

```bash
DATABASE_URL="<your prod pooled url>" \
DIRECT_URL="<your prod direct url>" \
SEED_ADMIN_USERNAME="admin" \
SEED_ADMIN_PASSWORD="<a strong password>" \
npm run db:seed
```

### 7. Deploy

`git push` to your Vercel-connected branch, or `npx vercel --prod`. That's it.

---

## Adding water / gas / maintenance later

The schema already includes a `UtilityType` enum on `BillingCycle`. To
support another utility:

1. Add the type to the enum (it's already there for the listed three).
2. Update the cycle-creation UI to show a "Utility" picker.
3. Filter the tenant dashboard's "open cycle" lookup by utility.
4. (Optional) Add per-utility settings to `AppSetting` (e.g.
   `gas.rate.fallback`).

The `Submission` model is already utility-agnostic (it stores a snapshot of
`ratePerKwh` regardless of which utility produced it).

---

## Available npm scripts

| Script | What it does |
|---|---|
| `npm run dev` | Start the Next.js dev server at <http://localhost:3000> |
| `npm run build` | Production build (generates Prisma client, then `next build`) |
| `npm run start` | Run the production build |
| `npm run lint` | Run ESLint |
| `npm run db:push` | Apply `schema.prisma` to the database (no migrations) |
| `npm run db:migrate` | Create + apply a Prisma migration |
| `npm run db:seed` | Run `prisma/seed.ts` |
| `npm run db:reset` | Drop + re-create the DB and re-seed (destructive) |
| `npm run db:studio` | Open Prisma Studio in the browser |

---

## Roadmap

Stuff that's intentionally wired but not implemented in v1:

- **Email notifications** — `src/lib/notifications.ts` is a no-op. Wire up
  Resend / SES by implementing the function bodies; every call site is
  already in place.
- **Water / gas / maintenance utilities** — enum + schema fields are ready;
  just need UI surface area.
- **Vercel Blob storage** — driver is stubbed; one `npm install
  @vercel/blob` + uncomment block away.
- **Push payment confirmation back into a webhook** — currently the tenant
  self-marks "I sent the payment" and the admin verifies. A future Bit
  Business API webhook would slot into `src/app/api/payments/...`.
