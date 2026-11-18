# SurBazaar — MVP

Pakistan's beat marketplace. Next.js 16 (App Router) + Supabase (Postgres, Auth, Storage), deployed on Vercel.

## What's in the MVP

**Buyers** — browse/search by genre, mood, instrument, key, BPM; waveform preview (tagged MP3); cart; checkout with
manual bank/Raast/wallet transfer; free non-profit licence claim; order history; licence PDF; secure downloads
(5-minute signed URLs, only the files the licence covers); public licence verification page.

**Producers** — apply with 3 sample links + CNIC + payout details; after approval upload beats (tagged preview public,
untagged MP3/WAV/stems private); choose licences and prices; sales list; wallet with 7-day hold; payout requests
(min PKR 2,000); 20-beat free-plan limit; public store page `/p/<slug>`.

**Admin** (`/admin`) — stats; approve/reject producers (founding producer = 0% commission); beat review queue with
master downloads; mark orders paid / cancel / refund; weekly payout batch; reports & takedowns; payment details shown
to buyers.

**Trust** — SHA-256 fingerprint of each preview with a duplicate check; report button; AI disclosure; producer
agreement; every sale creates a licence code anyone can verify.

## How money flows (no gateway yet)
1. Buyer places order → gets order number `SB-XXXXXXXX` and your account details (set in Admin → Payment settings).
2. Buyer transfers and submits the transaction ID.
3. Admin matches it and clicks **Mark paid** → downloads unlock, producer wallet credited (held 7 days), exclusive beats
   are pulled from sale automatically.

When you add Safepay/PayFast later, the webhook only needs to do what `admin_mark_order_paid` does (call
`_mark_order_paid` server-side with a service-role key).

## Business rules live in the database
All money logic runs in Postgres functions (`supabase/migrations`), protected by RLS. Prices, commissions and payouts
are computed server-side, so the browser can't tamper with them.

## Setup
```bash
cp .env.example .env.local   # fill in Supabase URL + publishable key
npm install
npm run dev
```
Apply `supabase/migrations/*.sql` in order to a fresh project.

Make yourself admin after signing up:
```sql
update public.profiles set role = 'admin' where email = 'you@example.com';
```

In Supabase → Authentication → URL configuration, set **Site URL** to your production domain and add
`https://<domain>/auth/callback` to **Redirect URLs**.

## Known limits / next steps
- Payment gateway (Safepay/PayFast/XPay) and USD checkout via a Merchant of Record.
- Transactional email (Resend): order confirmations, payout notices. Supabase's built-in email is rate-limited.
- Supabase Free plan caps uploads at 50 MB per file — upgrade or move masters to Cloudflare R2 for big stems.
- Real audio fingerprinting (e.g. ACRCloud) and automatic voice-tagging of previews.
- Licence PDF uses standard fonts (Latin script only); Urdu names show as `?`.
- Licence text is a draft — have a lawyer review before launch.
