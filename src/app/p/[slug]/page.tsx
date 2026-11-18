import { notFound } from "next/navigation";
import { BEAT_SELECT, BeatCard, type BeatRow } from "@/components/beat-card";
import { createClient } from "@/lib/supabase/server";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props) {
  return { title: (await params).slug };
}

export default async function ProducerPage({ params }: Props) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: producer } = await supabase
    .from("producer_profiles")
    .select("user_id, stage_name, city, bio, founding, created_at")
    .eq("slug", slug)
    .eq("status", "approved")
    .maybeSingle();
  if (!producer) notFound();
  const { data } = await supabase
    .from("beats")
    .select(BEAT_SELECT)
    .eq("producer_id", producer.user_id)
    .in("status", ["approved", "sold_exclusive"])
    .order("published_at", { ascending: false });
  const beats = (data ?? []) as unknown as BeatRow[];

  return (
    <div className="space-y-8">
      <div className="ajrak rounded-3xl border border-line p-8">
        <h1 className="h-display text-4xl">{producer.stage_name}</h1>
        <p className="mt-1 text-muted">
          {producer.city ?? "Pakistan"}
          {producer.founding && <span className="badge ml-2 border-saffron/50 text-saffron">Founding producer</span>}
        </p>
        {producer.bio && <p className="mt-4 max-w-2xl whitespace-pre-line text-sm text-muted">{producer.bio}</p>}
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {beats.map((b) => <BeatCard key={b.id} beat={b} />)}
      </div>
      {!beats.length && <p className="text-muted">No beats live yet.</p>}
    </div>
  );
}
