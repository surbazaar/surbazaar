export const GENRES = [
  { value: "desi-hiphop", label: "Desi Hip-Hop" },
  { value: "trap", label: "Trap" },
  { value: "drill", label: "Drill" },
  { value: "boom-bap", label: "Boom Bap" },
  { value: "punjabi", label: "Punjabi" },
  { value: "sufi-fusion", label: "Sufi Fusion" },
  { value: "qawwali-inspired", label: "Qawwali-inspired" },
  { value: "sindhi", label: "Sindhi" },
  { value: "pashto", label: "Pashto" },
  { value: "rnb", label: "R&B" },
  { value: "lofi", label: "Lo-fi" },
  { value: "pop", label: "Pop" },
  { value: "afrobeat", label: "Afrobeat" },
  { value: "cinematic", label: "Cinematic / Background" },
  { value: "other", label: "Other" },
] as const;

export const MOODS = [
  "Dark", "Energetic", "Romantic", "Sad", "Chill", "Aggressive", "Uplifting", "Spiritual", "Festive", "Epic",
] as const;

export const INSTRUMENTS = [
  "Tabla", "Dhol", "Sitar", "Rubab", "Harmonium", "Flute (Bansuri)", "Sarangi", "Tumbi", "Piano", "Guitar",
  "808", "Strings", "Synth", "Vocal chops",
] as const;

export const KEYS = [
  "C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B",
].flatMap((n) => [`${n} major`, `${n} minor`]);

export type LicenceType = "free" | "basic" | "premium" | "unlimited" | "exclusive";

export const LICENCE_ORDER: LicenceType[] = ["free", "basic", "premium", "unlimited", "exclusive"];

export const LICENCES: Record<
  LicenceType,
  { name: string; files: string; range: [number, number]; summary: string; terms: string[] }
> = {
  free: {
    name: "Free (non-profit)",
    files: "Tagged MP3",
    range: [0, 0],
    summary: "For practice, demos and non-monetised posts. Credit required.",
    terms: [
      "Non-commercial use only. You may not monetise the recording on any platform.",
      "The preview contains a SurBazaar voice tag, which must not be removed.",
      "Credit is required: \"Prod. by {producer} (SurBazaar)\".",
      "The producer keeps full ownership of the beat and may license it to others.",
    ],
  },
  basic: {
    name: "Basic lease",
    files: "MP3",
    range: [1000, 2000],
    summary: "Release one song with up to 100,000 streams and 1 music video.",
    terms: [
      "Non-exclusive: the producer may keep licensing the beat to others.",
      "One (1) commercial recording, distributed with up to 100,000 combined audio streams.",
      "One (1) music video, monetisation allowed.",
      "No broadcast (TV/radio) rights. Live performance allowed at non-profit events.",
      "Credit required: \"Prod. by {producer}\".",
    ],
  },
  premium: {
    name: "Premium lease",
    files: "MP3 + WAV",
    range: [2500, 5000],
    summary: "Higher caps, monetised music video and live shows.",
    terms: [
      "Non-exclusive: the producer may keep licensing the beat to others.",
      "One (1) commercial recording, up to 500,000 combined audio streams.",
      "Up to two (2) monetised music videos.",
      "Live performances allowed, including paid shows.",
      "Radio broadcast on up to 2 stations. Credit required.",
    ],
  },
  unlimited: {
    name: "Unlimited lease",
    files: "WAV + stems",
    range: [6000, 12000],
    summary: "No stream or video caps. Still non-exclusive.",
    terms: [
      "Non-exclusive: the producer may keep licensing the beat to others.",
      "One (1) commercial recording with unlimited streams, sales and videos.",
      "Live performances and broadcast allowed.",
      "Includes track stems for mixing.",
      "Credit required: \"Prod. by {producer}\".",
    ],
  },
  exclusive: {
    name: "Exclusive",
    files: "WAV + stems",
    range: [15000, 1000000],
    summary: "Full rights. The beat is removed from sale.",
    terms: [
      "Exclusive: the beat is removed from SurBazaar and will not be licensed again.",
      "Unlimited commercial use, streams, videos, broadcast and performances.",
      "Licences sold before this exclusive remain valid for their holders.",
      "The producer keeps authorship credit and publishing share unless agreed otherwise in writing.",
      "Credit required: \"Prod. by {producer}\".",
    ],
  },
};

export const LICENCE_FILES: Record<LicenceType, ("mp3" | "wav" | "stems")[]> = {
  free: [],
  basic: ["mp3"],
  premium: ["mp3", "wav"],
  unlimited: ["mp3", "wav", "stems"],
  exclusive: ["mp3", "wav", "stems"],
};

export const MASTER_FILENAMES = { mp3: "master.mp3", wav: "master.wav", stems: "stems.zip" } as const;

export const REPORT_REASONS = [
  { value: "copyright", label: "Copies a copyrighted song" },
  { value: "uncleared_sample", label: "Uses an uncleared sample" },
  { value: "stolen_beat", label: "This is my beat (stolen)" },
  { value: "ai_undisclosed", label: "AI-generated but not declared" },
  { value: "offensive", label: "Offensive content" },
  { value: "other", label: "Other" },
] as const;

export const MIN_PAYOUT = 2000;
export const HOLD_DAYS = 7;

export function genreLabel(v: string) {
  return GENRES.find((g) => g.value === v)?.label ?? v;
}
