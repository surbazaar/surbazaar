"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { BeatFields } from "@/components/beat-fields";
import { LICENCE_ORDER, MASTER_FILENAMES, type LicenceType } from "@/lib/constants";

// Files each licence needs before it can be offered.
const NEEDS: Partial<Record<LicenceType, ("mp3" | "wav" | "stems")[]>> = {
  basic: ["mp3"],
  premium: ["mp3", "wav"],
  unlimited: ["wav", "stems"],
  exclusive: ["wav", "stems"],
};

const MIME: Record<string, string> = { mp3: "audio/mpeg", wav: "audio/wav", zip: "application/zip", jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp" };
const ext = (f: File) => f.name.split(".").pop()?.toLowerCase() ?? "";

async function sha256(file: File) {
  const buf = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function UploadForm({ userId }: { userId: string }) {
  const router = useRouter();
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    const file = (k: string) => {
      const f = fd.get(k);
      return f instanceof File && f.size > 0 ? f : null;
    };
    const preview = file("preview");
    const artwork = file("artwork");
    const masters = { mp3: file("mp3"), wav: file("wav"), stems: file("stems") };

    if (!preview || ext(preview) !== "mp3") return setError("Upload a tagged MP3 preview.");
    if (masters.mp3 && ext(masters.mp3) !== "mp3") return setError("Untagged MP3 must be an .mp3 file.");
    if (masters.wav && ext(masters.wav) !== "wav") return setError("WAV must be a .wav file.");
    if (masters.stems && ext(masters.stems) !== "zip") return setError("Stems must be a single .zip file.");
    if (!fd.get("original")) return setError("Please confirm this beat is your original work.");

    const licences = LICENCE_ORDER.filter((t) => fd.get(`lic_${t}`)).map((t) => ({
      licence_type: t,
      price_pkr: t === "free" ? 0 : Math.floor(Number(fd.get(`price_${t}`)) || 0),
    }));
    if (!licences.length) return setError("Offer at least one licence.");
    for (const l of licences) {
      if (l.licence_type !== "free" && l.price_pkr <= 0) return setError(`Set a price for the ${l.licence_type} licence.`);
      const missing = (NEEDS[l.licence_type] ?? []).filter((f) => !masters[f]);
      if (missing.length) return setError(`The ${l.licence_type} licence needs: ${missing.map((m) => (m === "stems" ? "stems ZIP" : m.toUpperCase())).join(", ")}.`);
    }

    setBusy(true);
    const supabase = createClient();
    const beatId = crypto.randomUUID();
    const base = `${userId}/${beatId}`;
    const uploaded: { bucket: string; path: string }[] = [];
    const put = async (bucket: string, path: string, f: File) => {
      setStatus(`Uploading ${f.name} (${(f.size / 1048576).toFixed(1)} MB)…`);
      const { error } = await supabase.storage.from(bucket).upload(path, f, { contentType: MIME[ext(f)] ?? f.type, upsert: false });
      if (error) throw new Error(`${f.name}: ${error.message}`);
      uploaded.push({ bucket, path });
    };

    try {
      setStatus("Checking fingerprint…");
      const hash = await sha256(preview);
      const { data: dup } = await supabase.rpc("hash_in_use", { p_hash: hash });
      if (dup) throw new Error("This preview matches a file another producer already uploaded. If it's yours, contact support.");

      await put("previews", `${base}/preview.mp3`, preview);
      let artworkPath: string | null = null;
      if (artwork) {
        artworkPath = `${base}/artwork.${ext(artwork)}`;
        await put("previews", artworkPath, artwork);
      }
      for (const k of ["mp3", "wav", "stems"] as const) {
        const f = masters[k];
        if (f) await put("masters", `${base}/${MASTER_FILENAMES[k]}`, f);
      }

      setStatus("Saving beat…");
      const bpm = Number(fd.get("bpm")) || null;
      const { error: be } = await supabase.from("beats").insert({
        id: beatId,
        producer_id: userId,
        title: String(fd.get("title")).trim(),
        description: String(fd.get("description") ?? "").trim() || null,
        genre: String(fd.get("genre")),
        moods: fd.getAll("moods").map(String),
        instruments: fd.getAll("instruments").map(String),
        tags: String(fd.get("tags") ?? "").split(",").map((t) => t.trim().toLowerCase()).filter(Boolean).slice(0, 15),
        bpm,
        musical_key: String(fd.get("musical_key") ?? "") || null,
        ai_generated: !!fd.get("ai_generated"),
        ai_tool: String(fd.get("ai_tool") ?? "").trim() || null,
        preview_path: `${base}/preview.mp3`,
        artwork_path: artworkPath,
        has_mp3: !!masters.mp3,
        has_wav: !!masters.wav,
        has_stems: !!masters.stems,
        file_hash: hash,
      });
      if (be) throw new Error(be.message);
      const { error: le } = await supabase.from("beat_licences").insert(licences.map((l) => ({ ...l, beat_id: beatId })));
      if (le) throw new Error(le.message);

      setStatus("Done! Your beat is in the review queue.");
      router.push("/studio");
      router.refresh();
    } catch (err) {
      // Best-effort cleanup of files from a failed upload
      for (const u of uploaded) await supabase.storage.from(u.bucket).remove([u.path]);
      setError(err instanceof Error ? err.message : "Upload failed");
      setStatus(null);
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="card space-y-6 p-6">
      <BeatFields />
      <div className="space-y-3 border-t border-line pt-5">
        <span className="label">Files</span>
        <FileInput name="preview" label="Tagged preview MP3 (public, with your voice tag)" accept=".mp3,audio/mpeg" required />
        <FileInput name="artwork" label="Artwork (square JPG/PNG, optional)" accept="image/jpeg,image/png,image/webp" />
        <FileInput name="mp3" label="Untagged MP3 (private — Basic & Premium)" accept=".mp3,audio/mpeg" />
        <FileInput name="wav" label="Untagged WAV (private — Premium, Unlimited, Exclusive)" accept=".wav,audio/wav" />
        <FileInput name="stems" label="Stems as one ZIP (private — Unlimited & Exclusive)" accept=".zip,application/zip" />
        <p className="text-xs text-muted">Private files are only delivered to buyers through expiring links. Max 50 MB per file for now.</p>
      </div>
      <label className="flex items-start gap-2 text-sm text-muted">
        <input type="checkbox" name="original" className="mt-1 accent-saffron" />
        This is my original work. All samples are cleared or royalty-free, and it contains no vocals or melodies from
        copyrighted songs (Bollywood, Coke Studio, etc.).
      </label>
      {error && <p className="text-sm text-henna">{error}</p>}
      {status && <p className="text-sm text-teal">{status}</p>}
      <button type="submit" disabled={busy} className="btn-primary">{busy ? "Uploading…" : "Submit for review"}</button>
    </form>
  );
}

function FileInput({ name, label, accept, required }: { name: string; label: string; accept: string; required?: boolean }) {
  return (
    <div>
      <label className="mb-1 block text-sm" htmlFor={name}>{label}{required && <span className="text-henna"> *</span>}</label>
      <input id={name} name={name} type="file" accept={accept} required={required} className="block w-full text-sm text-muted file:mr-3 file:rounded-full file:border-0 file:bg-panel-2 file:px-4 file:py-2 file:text-sand hover:file:bg-line" />
    </div>
  );
}
