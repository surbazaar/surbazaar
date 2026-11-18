import Link from "next/link";
import { genreLabel } from "@/lib/constants";
import { pkr, publicUrl } from "@/lib/utils";
import { TrackPlayButton } from "./player";

export type BeatRow = {
  id: string;
  title: string;
  genre: string;
  bpm: number | null;
  musical_key: string | null;
  moods: string[];
  preview_path: string | null;
  artwork_path: string | null;
  status: string;
  ai_generated: boolean;
  producer: { stage_name: string; slug: string; founding: boolean } | null;
  beat_licences: { licence_type: string; price_pkr: number; enabled: boolean }[];
};

export const BEAT_SELECT =
  "id, title, genre, bpm, musical_key, moods, preview_path, artwork_path, status, ai_generated, producer:producer_profiles(stage_name, slug, founding), beat_licences(licence_type, price_pkr, enabled)";

export function fromPrice(b: BeatRow) {
  const paid = b.beat_licences.filter((l) => l.enabled && l.price_pkr > 0).map((l) => l.price_pkr);
  return paid.length ? Math.min(...paid) : null;
}

export function Artwork({ path, title, className = "" }: { path: string | null; title: string; className?: string }) {
  const url = publicUrl(path);
  if (url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt="" className={`aspect-square w-full object-cover ${className}`} />;
  }
  // Deterministic placeholder pattern from the title
  const hue = [...title].reduce((a, c) => a + c.charCodeAt(0), 0) % 40;
  return (
    <div
      className={`ajrak grid aspect-square w-full place-items-center ${className}`}
      style={{ backgroundColor: `hsl(${20 + hue} 45% 14%)` }}
    >
      <span className="h-display text-4xl text-saffron/70">{title.slice(0, 1).toUpperCase()}</span>
    </div>
  );
}

export function BeatCard({ beat }: { beat: BeatRow }) {
  const price = fromPrice(beat);
  const hasFree = beat.beat_licences.some((l) => l.licence_type === "free" && l.enabled);
  const src = publicUrl(beat.preview_path);
  return (
    <div className="card group overflow-hidden">
      <div className="relative">
        <Link href={`/beats/${beat.id}`}>
          <Artwork path={beat.artwork_path} title={beat.title} />
        </Link>
        {src && (
          <div className="absolute right-3 bottom-3 opacity-90 transition group-hover:opacity-100">
            <TrackPlayButton
              track={{ id: beat.id, title: beat.title, producer: beat.producer?.stage_name ?? "", src }}
            />
          </div>
        )}
        {beat.status === "sold_exclusive" && (
          <span className="absolute top-3 left-3 rounded-full bg-henna px-2 py-0.5 text-[11px] font-bold text-ink">
            SOLD EXCLUSIVE
          </span>
        )}
      </div>
      <div className="space-y-1 p-3">
        <Link href={`/beats/${beat.id}`} className="block truncate font-semibold hover:text-saffron">
          {beat.title}
        </Link>
        {beat.producer && (
          <Link href={`/p/${beat.producer.slug}`} className="block truncate text-xs text-muted hover:text-sand">
            {beat.producer.stage_name}
          </Link>
        )}
        <div className="flex flex-wrap items-center gap-1 pt-1">
          <span className="badge">{genreLabel(beat.genre)}</span>
          {beat.bpm && <span className="badge">{beat.bpm} BPM</span>}
          {beat.ai_generated && <span className="badge border-teal/50 text-teal">AI</span>}
        </div>
        <div className="flex items-center justify-between pt-1 text-sm">
          <span className="font-semibold text-saffron">{price ? `from ${pkr(price)}` : hasFree ? "Free" : "—"}</span>
          {hasFree && price && <span className="text-[11px] text-teal">free tagged</span>}
        </div>
      </div>
    </div>
  );
}
