import Link from "next/link";
import { notFound } from "next/navigation";
import { BeatFields } from "@/components/beat-fields";
import { ActionForm, Submit } from "@/components/forms";
import { StatusBadge } from "@/components/status";
import { removeBeat, updateBeat } from "@/app/actions/producer";
import { requireProducer } from "@/lib/auth";

export const metadata = { title: "Edit beat" };

export default async function EditBeatPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user } = await requireProducer();
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const { data: beat } = await supabase.from("beats").select("*, beat_licences(*)").eq("id", id).eq("producer_id", user.id).maybeSingle();
  if (!beat) notFound();
  const frozen = beat.status === "sold_exclusive";

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="h-display text-3xl">{beat.title}</h1>
        <StatusBadge status={beat.status} />
        <Link href={`/beats/${beat.id}`} className="link text-sm">View page</Link>
      </div>
      {beat.review_note && <p className="card p-4 text-sm text-saffron">Review note: {beat.review_note}</p>}
      <p className="text-sm text-muted">
        Files: preview ✓ · MP3 {beat.has_mp3 ? "✓" : "—"} · WAV {beat.has_wav ? "✓" : "—"} · stems {beat.has_stems ? "✓" : "—"}.
        To replace audio, remove this beat and upload it again.
      </p>
      {frozen ? (
        <p className="card p-6 text-muted">This beat was sold exclusively and can no longer be edited.</p>
      ) : (
        <>
          <ActionForm action={updateBeat} className="card space-y-6 p-6">
            <input type="hidden" name="beat_id" value={beat.id} />
            <BeatFields d={{ ...beat, licences: beat.beat_licences }} />
            <Submit>Save changes</Submit>
          </ActionForm>
          {beat.status !== "removed" && (
            <form action={removeBeat} className="text-right">
              <input type="hidden" name="beat_id" value={beat.id} />
              <button className="btn-danger">Take this beat down</button>
            </form>
          )}
        </>
      )}
    </div>
  );
}
