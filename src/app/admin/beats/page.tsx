import Link from "next/link";
import { ActionForm } from "@/components/forms";
import { reviewBeat } from "@/app/actions/admin";
import { requireAdmin } from "@/lib/auth";
import { genreLabel, MASTER_FILENAMES } from "@/lib/constants";
import { date, pkr, publicUrl } from "@/lib/utils";

export const metadata = { title: "Beat review · Admin" };

export default async function AdminBeats() {
  const { supabase } = await requireAdmin();
  const { data: beats } = await supabase
    .from("beats")
    .select("*, producer:producer_profiles(stage_name, slug), beat_licences(licence_type, price_pkr, enabled)")
    .eq("status", "pending")
    .order("updated_at")
    .limit(30);

  // Signed links so the reviewer can check the untagged masters.
  const signed = new Map<string, string>();
  const paths = (beats ?? []).flatMap((b) =>
    (["mp3", "wav", "stems"] as const).filter((k) => b[`has_${k}`]).map((k) => `${b.producer_id}/${b.id}/${MASTER_FILENAMES[k]}`));
  if (paths.length) {
    const { data } = await supabase.storage.from("masters").createSignedUrls(paths, 3600);
    data?.forEach((d) => d.path && d.signedUrl && signed.set(d.path, d.signedUrl));
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">
        Checklist: clean mix level, no clipping, voice tag on the preview, tags correct, no recognisable commercial samples,
        AI use declared. Search a distinctive part on Shazam/YouTube if in doubt.
      </p>
      {!beats?.length && <p className="card p-8 text-center text-muted">Queue is empty 🎉</p>}
      {beats?.map((b) => (
        <div key={b.id} className="card space-y-3 p-5">
          <div className="flex flex-wrap items-baseline gap-3">
            <Link href={`/beats/${b.id}`} className="text-lg font-semibold hover:text-saffron">{b.title}</Link>
            <span className="text-sm text-muted">by {b.producer?.stage_name} · {genreLabel(b.genre)} · {b.bpm ?? "?"} BPM · {date(b.updated_at)}</span>
            {b.ai_generated && <span className="badge border-teal/50 text-teal">AI: {b.ai_tool || "unspecified"}</span>}
          </div>
          {publicUrl(b.preview_path) && <audio controls preload="none" src={publicUrl(b.preview_path)!} className="w-full" />}
          <div className="flex flex-wrap gap-3 text-sm">
            {(["mp3", "wav", "stems"] as const).map((k) => {
              const url = signed.get(`${b.producer_id}/${b.id}/${MASTER_FILENAMES[k]}`);
              return url ? <a key={k} href={url} className="link">{k.toUpperCase()} master</a> : <span key={k} className="text-muted">no {k}</span>;
            })}
            <span className="text-muted">|</span>
            {b.beat_licences.filter((l: { enabled: boolean }) => l.enabled).map((l: { licence_type: string; price_pkr: number }) => (
              <span key={l.licence_type} className="badge">{l.licence_type}: {pkr(l.price_pkr)}</span>
            ))}
          </div>
          {b.tags.length > 0 && <p className="text-xs text-muted">Tags: {b.tags.join(", ")}</p>}
          <ActionForm action={reviewBeat} className="flex flex-wrap items-center gap-2 border-t border-line pt-3">
            <input type="hidden" name="beat_id" value={b.id} />
            <input name="note" placeholder="Note to producer (required when rejecting)" className="input max-w-md" />
            <button name="decision" value="approve" className="btn-primary">Approve</button>
            <button name="decision" value="reject" className="btn-danger">Reject</button>
          </ActionForm>
        </div>
      ))}
    </div>
  );
}
