import Link from "next/link";
import { BEAT_SELECT, BeatCard, type BeatRow } from "@/components/beat-card";
import { GENRES, INSTRUMENTS, KEYS, MOODS } from "@/lib/constants";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Browse beats" };
const PAGE = 24;

type SP = { q?: string; genre?: string; mood?: string; instrument?: string; key?: string; bpm_min?: string; bpm_max?: string; sort?: string; page?: string };

export default async function BeatsPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const supabase = await createClient();

  let q = supabase.from("beats").select(BEAT_SELECT, { count: "exact" }).eq("status", "approved");
  if (sp.q?.trim()) q = q.textSearch("search", sp.q.trim(), { type: "websearch", config: "simple" });
  if (sp.genre) q = q.eq("genre", sp.genre);
  if (sp.mood) q = q.contains("moods", [sp.mood]);
  if (sp.instrument) q = q.contains("instruments", [sp.instrument]);
  if (sp.key) q = q.eq("musical_key", sp.key);
  if (Number(sp.bpm_min)) q = q.gte("bpm", Number(sp.bpm_min));
  if (Number(sp.bpm_max)) q = q.lte("bpm", Number(sp.bpm_max));
  q = sp.sort === "popular" ? q.order("plays", { ascending: false }) : q.order("published_at", { ascending: false });
  const { data, count } = await q.range((page - 1) * PAGE, page * PAGE - 1);
  const beats = (data ?? []) as unknown as BeatRow[];
  const pages = Math.ceil((count ?? 0) / PAGE);

  const pageLink = (p: number) => {
    const u = new URLSearchParams(Object.entries(sp).filter(([, v]) => v) as [string, string][]);
    u.set("page", String(p));
    return `/beats?${u}`;
  };

  return (
    <div className="grid gap-8 lg:grid-cols-[240px_1fr]">
      <form className="card h-fit space-y-4 p-4 lg:sticky lg:top-20">
        <div>
          <label className="label" htmlFor="q">Search</label>
          <input id="q" name="q" defaultValue={sp.q} placeholder="tabla, drill, Talha Anjum type…" className="input" />
        </div>
        <Select name="genre" label="Genre" value={sp.genre} options={GENRES.map((g) => [g.value, g.label])} />
        <Select name="mood" label="Mood" value={sp.mood} options={MOODS.map((m) => [m, m])} />
        <Select name="instrument" label="Instrument" value={sp.instrument} options={INSTRUMENTS.map((m) => [m, m])} />
        <Select name="key" label="Key" value={sp.key} options={KEYS.map((m) => [m, m])} />
        <div>
          <span className="label">BPM</span>
          <div className="flex gap-2">
            <input name="bpm_min" type="number" min={40} max={250} placeholder="min" defaultValue={sp.bpm_min} className="input" />
            <input name="bpm_max" type="number" min={40} max={250} placeholder="max" defaultValue={sp.bpm_max} className="input" />
          </div>
        </div>
        <Select name="sort" label="Sort" value={sp.sort} options={[["popular", "Most played"]]} empty="Newest" />
        <div className="flex gap-2">
          <button className="btn-primary flex-1">Apply</button>
          <Link href="/beats" className="btn-ghost">Reset</Link>
        </div>
      </form>

      <div>
        <h1 className="h-display text-3xl">Beats</h1>
        <p className="mt-1 text-sm text-muted">{count ?? 0} beats</p>
        {beats.length ? (
          <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3">
            {beats.map((b) => <BeatCard key={b.id} beat={b} />)}
          </div>
        ) : (
          <div className="card mt-5 p-8 text-center text-muted">No beats match these filters yet.</div>
        )}
        {pages > 1 && (
          <div className="mt-8 flex items-center justify-center gap-3 text-sm">
            {page > 1 && <Link href={pageLink(page - 1)} className="btn-ghost">Previous</Link>}
            <span className="text-muted">Page {page} of {pages}</span>
            {page < pages && <Link href={pageLink(page + 1)} className="btn-ghost">Next</Link>}
          </div>
        )}
      </div>
    </div>
  );
}

function Select({ name, label, value, options, empty = "Any" }: { name: string; label: string; value?: string; options: string[][]; empty?: string }) {
  return (
    <div>
      <label className="label" htmlFor={name}>{label}</label>
      <select id={name} name={name} defaultValue={value ?? ""} className="input">
        <option value="">{empty}</option>
        {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
    </div>
  );
}
