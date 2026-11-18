import Link from "next/link";
import { BEAT_SELECT, BeatCard, type BeatRow } from "@/components/beat-card";
import { GENRES } from "@/lib/constants";
import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = await createClient();
  const [{ data: latest }, { data: popular }] = await Promise.all([
    supabase.from("beats").select(BEAT_SELECT).eq("status", "approved").order("published_at", { ascending: false }).limit(8),
    supabase.from("beats").select(BEAT_SELECT).eq("status", "approved").order("plays", { ascending: false }).limit(4),
  ]);

  return (
    <div className="space-y-16">
      <section className="ajrak relative overflow-hidden rounded-3xl border border-line px-6 py-14 sm:px-12 sm:py-20">
        <p className="text-xs font-semibold tracking-[0.25em] text-saffron uppercase">Beats · Licences · PKR payments</p>
        <h1 className="h-display mt-4 max-w-3xl text-4xl leading-tight sm:text-6xl">
          Pakistan&apos;s sound, licensed properly.
        </h1>
        <p className="mt-5 max-w-xl text-lg text-muted">
          Desi hip-hop, Punjabi, Sufi fusion and more from vetted Pakistani producers. Pay in PKR, download instantly,
          and get a licence PDF with every beat.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/beats" className="btn-primary px-6 py-3 text-base">Browse beats</Link>
          <Link href="/sell" className="btn-ghost px-6 py-3 text-base">Sell your beats — keep 80%</Link>
        </div>
      </section>

      <section>
        <div className="flex items-end justify-between">
          <h2 className="h-display text-2xl">Fresh drops</h2>
          <Link href="/beats" className="link text-sm">See all</Link>
        </div>
        {latest && latest.length > 0 ? (
          <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {(latest as unknown as BeatRow[]).map((b) => <BeatCard key={b.id} beat={b} />)}
          </div>
        ) : (
          <div className="card mt-5 p-8 text-center text-muted">
            The first beats are being reviewed. <Link href="/sell" className="link">Producers: apply now</Link> to be a
            founding producer (0% commission for 6 months).
          </div>
        )}
      </section>

      <section>
        <h2 className="h-display text-2xl">Browse by sound</h2>
        <div className="mt-5 flex flex-wrap gap-2">
          {GENRES.map((g) => (
            <Link key={g.value} href={`/beats?genre=${g.value}`} className="btn-ghost">{g.label}</Link>
          ))}
        </div>
      </section>

      {popular && popular.length > 0 && (
        <section>
          <h2 className="h-display text-2xl">Most played</h2>
          <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {(popular as unknown as BeatRow[]).map((b) => <BeatCard key={b.id} beat={b} />)}
          </div>
        </section>
      )}

      <section className="grid gap-4 sm:grid-cols-3">
        {[
          ["Pay your way", "Raast, bank transfer, JazzCash or Easypaisa in PKR. No dollar card needed."],
          ["A licence with every beat", "Each purchase creates a licence PDF with your name, the beat and its terms — verifiable online."],
          ["Producers paid in PKR", "Producers keep 80% of every sale and withdraw to their wallet or bank weekly."],
        ].map(([t, d]) => (
          <div key={t} className="card p-6">
            <h3 className="font-semibold text-saffron">{t}</h3>
            <p className="mt-2 text-sm text-muted">{d}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
