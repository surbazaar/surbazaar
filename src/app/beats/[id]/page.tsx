import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Artwork } from "@/components/beat-card";
import { ActionForm, Submit } from "@/components/forms";
import { Waveform } from "@/components/waveform";
import { addToCart, claimFree, reportBeat } from "@/app/actions/shop";
import { getSession } from "@/lib/auth";
import { LICENCE_ORDER, LICENCES, REPORT_REASONS, genreLabel, type LicenceType } from "@/lib/constants";
import { date, pkr, publicUrl } from "@/lib/utils";

type Props = { params: Promise<{ id: string }> };

async function load(id: string) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const { supabase, user, profile } = await getSession();
  const { data: beat } = await supabase
    .from("beats")
    .select("*, producer:producer_profiles(user_id, stage_name, slug, city, founding), beat_licences(licence_type, price_pkr, enabled)")
    .eq("id", id)
    .maybeSingle();
  return beat ? { beat, user, profile } : null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const r = await load((await params).id);
  return { title: r ? `${r.beat.title} by ${r.beat.producer?.stage_name}` : "Beat not found" };
}

export default async function BeatPage({ params }: Props) {
  const r = await load((await params).id);
  if (!r) notFound();
  const { beat, user, profile } = r;
  const licences = (beat.beat_licences as { licence_type: LicenceType; price_pkr: number; enabled: boolean }[])
    .filter((l) => l.enabled)
    .sort((a, b) => LICENCE_ORDER.indexOf(a.licence_type) - LICENCE_ORDER.indexOf(b.licence_type));
  const paid = licences.filter((l) => l.licence_type !== "free");
  const free = licences.find((l) => l.licence_type === "free");
  const src = publicUrl(beat.preview_path);
  const isOwner = user?.id === beat.producer_id;
  const live = beat.status === "approved";

  return (
    <div className="space-y-10">
      {!live && (
        <div className="card border-saffron/40 p-4 text-sm text-saffron">
          {beat.status === "sold_exclusive"
            ? "This beat was sold exclusively and is no longer for sale. Existing licences stay valid."
            : `Status: ${beat.status}. Only you${profile?.role === "admin" ? " (admin)" : ""} can see this page.`}
        </div>
      )}

      <div className="grid gap-8 md:grid-cols-[280px_1fr]">
        <Artwork path={beat.artwork_path} title={beat.title} className="rounded-2xl border border-line" />
        <div className="min-w-0 space-y-4">
          <div>
            <h1 className="h-display text-4xl">{beat.title}</h1>
            <p className="mt-1 text-muted">
              by{" "}
              <Link href={`/p/${beat.producer.slug}`} className="link">{beat.producer.stage_name}</Link>
              {beat.producer.city && ` · ${beat.producer.city}`}
              {beat.producer.founding && <span className="badge ml-2 border-saffron/50 text-saffron">Founding producer</span>}
            </p>
          </div>
          {src ? (
            <Waveform track={{ id: beat.id, title: beat.title, producer: beat.producer.stage_name, src }} />
          ) : (
            <p className="text-sm text-muted">No preview uploaded.</p>
          )}
          <div className="flex flex-wrap gap-2">
            <span className="badge">{genreLabel(beat.genre)}</span>
            {beat.bpm && <span className="badge">{beat.bpm} BPM</span>}
            {beat.musical_key && <span className="badge">{beat.musical_key}</span>}
            {beat.moods.map((m: string) => <span key={m} className="badge">{m}</span>)}
            {beat.instruments.map((m: string) => <span key={m} className="badge">{m}</span>)}
            {beat.ai_generated && (
              <span className="badge border-teal/50 text-teal">AI-assisted{beat.ai_tool ? ` (${beat.ai_tool})` : ""}</span>
            )}
          </div>
          {beat.description && <p className="max-w-2xl whitespace-pre-line text-sm text-muted">{beat.description}</p>}
          {beat.tags.length > 0 && (
            <p className="text-xs text-muted">Tags: {beat.tags.map((t: string) => `#${t}`).join(" ")}</p>
          )}
        </div>
      </div>

      {live && !isOwner && (
        <section className="grid gap-6 lg:grid-cols-[1fr_340px]">
          <div>
            <h2 className="h-display text-2xl">Choose a licence</h2>
            {paid.length ? (
              <ActionForm action={addToCart} className="mt-4 space-y-3">
                <input type="hidden" name="beat_id" value={beat.id} />
                {paid.map((l, i) => {
                  const info = LICENCES[l.licence_type];
                  return (
                    <label key={l.licence_type} className="card flex cursor-pointer items-start gap-4 p-4 has-[:checked]:border-saffron">
                      <input type="radio" name="licence" value={l.licence_type} defaultChecked={i === 0} className="mt-1 accent-saffron" />
                      <div className="flex-1">
                        <div className="flex items-baseline justify-between gap-3">
                          <span className="font-semibold">{info.name}</span>
                          <span className="font-semibold text-saffron">{pkr(l.price_pkr)}</span>
                        </div>
                        <div className="text-xs text-muted">{info.files} · {info.summary}</div>
                      </div>
                    </label>
                  );
                })}
                <div className="flex items-center gap-4">
                  <Submit>Add to cart</Submit>
                  <Link href="/licences" className="text-sm text-muted hover:text-sand">Compare licence terms</Link>
                </div>
              </ActionForm>
            ) : (
              <p className="mt-3 text-sm text-muted">This beat is only offered under the free licence.</p>
            )}
          </div>

          {free && (
            <div className="card h-fit p-5">
              <h3 className="font-semibold">Free for non-profit use</h3>
              <p className="mt-1 text-xs text-muted">{LICENCES.free.summary} You get the tagged MP3 and a licence PDF.</p>
              {user ? (
                <ActionForm action={claimFree} className="mt-4 space-y-3">
                  <input type="hidden" name="beat_id" value={beat.id} />
                  <input name="buyer_name" required placeholder="Licensee name (you or your artist name)" defaultValue={profile?.display_name} className="input" />
                  <label className="flex items-start gap-2 text-xs text-muted">
                    <input type="checkbox" name="agree" required className="mt-0.5 accent-saffron" />
                    I won&apos;t monetise this and will credit the producer.
                  </label>
                  <Submit className="btn-ghost w-full">Get free licence</Submit>
                </ActionForm>
              ) : (
                <Link href={`/login?next=/beats/${beat.id}`} className="btn-ghost mt-4 w-full">Sign in to download free</Link>
              )}
            </div>
          )}
        </section>
      )}

      {isOwner && (
        <div className="card p-4 text-sm">
          This is your beat. <Link href={`/studio/beats/${beat.id}`} className="link">Edit it in your studio</Link>.
        </div>
      )}

      <section className="grid gap-6 border-t border-line pt-8 text-sm text-muted md:grid-cols-2">
        <div>
          <h3 className="font-semibold text-sand">Proof of upload</h3>
          <p className="mt-1">
            Uploaded {date(beat.created_at)}
            {beat.file_hash && <> · fingerprint <code className="font-mono text-xs">{beat.file_hash.slice(0, 16)}…</code></>}
          </p>
          <p className="mt-1">The producer has confirmed this is original work with all samples cleared.</p>
        </div>
        <details className="group">
          <summary className="cursor-pointer font-semibold text-sand">Report this beat</summary>
          <ActionForm action={reportBeat} className="mt-3 space-y-3">
            <input type="hidden" name="beat_id" value={beat.id} />
            <select name="reason" required className="input">
              {REPORT_REASONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
            <textarea name="details" rows={3} placeholder="Details, links to the original…" className="input" />
            {!user && <input name="email" type="email" required placeholder="Your email" className="input" />}
            <Submit className="btn-danger">Send report</Submit>
          </ActionForm>
        </details>
      </section>
    </div>
  );
}
