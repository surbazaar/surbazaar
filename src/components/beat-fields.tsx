import { GENRES, INSTRUMENTS, KEYS, LICENCE_ORDER, LICENCES, MOODS, type LicenceType } from "@/lib/constants";

export type BeatDefaults = {
  title?: string; description?: string | null; genre?: string; moods?: string[]; instruments?: string[];
  tags?: string[]; bpm?: number | null; musical_key?: string | null; ai_generated?: boolean; ai_tool?: string | null;
  licences?: { licence_type: LicenceType; price_pkr: number; enabled: boolean }[];
};

const DEFAULT_PRICES: Record<LicenceType, number> = { free: 0, basic: 1500, premium: 3500, unlimited: 8000, exclusive: 25000 };

/** Metadata + licence fields shared by upload and edit forms. */
export function BeatFields({ d = {} }: { d?: BeatDefaults }) {
  const lic = (t: LicenceType) => d.licences?.find((l) => l.licence_type === t);
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="label" htmlFor="title">Title</label>
          <input id="title" name="title" required maxLength={100} defaultValue={d.title} className="input" />
        </div>
        <div>
          <label className="label" htmlFor="genre">Genre</label>
          <select id="genre" name="genre" required defaultValue={d.genre ?? ""} className="input">
            <option value="" disabled>Choose…</option>
            {GENRES.map((g) => <option key={g.value} value={g.value}>{g.label}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="label" htmlFor="bpm">BPM</label>
            <input id="bpm" name="bpm" type="number" min={40} max={250} defaultValue={d.bpm ?? ""} className="input" />
          </div>
          <div>
            <label className="label" htmlFor="musical_key">Key</label>
            <select id="musical_key" name="musical_key" defaultValue={d.musical_key ?? ""} className="input">
              <option value="">—</option>
              {KEYS.map((k) => <option key={k} value={k}>{k}</option>)}
            </select>
          </div>
        </div>
      </div>
      <Chips name="moods" label="Moods" options={MOODS} selected={d.moods} />
      <Chips name="instruments" label="Instruments" options={INSTRUMENTS} selected={d.instruments} />
      <div>
        <label className="label" htmlFor="tags">Tags (comma separated)</label>
        <input id="tags" name="tags" defaultValue={d.tags?.join(", ")} placeholder="desi trap, talha anjum type beat, dhol" className="input" />
      </div>
      <div>
        <label className="label" htmlFor="description">Description</label>
        <textarea id="description" name="description" rows={3} maxLength={2000} defaultValue={d.description ?? ""} className="input" />
      </div>
      <div className="flex flex-wrap items-center gap-4 rounded-lg border border-line p-3 text-sm">
        <label className="flex items-center gap-2">
          <input type="checkbox" name="ai_generated" defaultChecked={d.ai_generated} className="accent-saffron" />
          Made fully or partly with AI tools
        </label>
        <input name="ai_tool" defaultValue={d.ai_tool ?? ""} placeholder="Which tool? (must allow commercial use)" className="input max-w-xs" />
      </div>

      <div>
        <span className="label">Licences & prices (PKR)</span>
        <div className="space-y-2">
          {LICENCE_ORDER.map((t) => {
            const l = lic(t);
            const info = LICENCES[t];
            return (
              <div key={t} className="flex flex-wrap items-center gap-3 rounded-lg border border-line p-3">
                <label className="flex min-w-48 flex-1 items-center gap-2 text-sm">
                  <input type="checkbox" name={`lic_${t}`} defaultChecked={l ? l.enabled : t !== "exclusive"} className="accent-saffron" />
                  <span>
                    <b>{info.name}</b> <span className="text-muted">· {info.files}</span>
                  </span>
                </label>
                {t !== "free" ? (
                  <div className="flex items-center gap-2">
                    <input name={`price_${t}`} type="number" min={100} step={50} defaultValue={l?.price_pkr ?? DEFAULT_PRICES[t]} className="input w-32" />
                    <span className="text-xs text-muted">
                      suggested {info.range[0].toLocaleString()}{t === "exclusive" ? "+" : `–${info.range[1].toLocaleString()}`}
                    </span>
                  </div>
                ) : (
                  <span className="text-xs text-muted">Tagged preview, credit required</span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}

function Chips({ name, label, options, selected = [] }: { name: string; label: string; options: readonly string[]; selected?: string[] }) {
  return (
    <div>
      <span className="label">{label}</span>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => (
          <label key={o} className="cursor-pointer rounded-full border border-line px-3 py-1 text-xs text-muted has-[:checked]:border-saffron has-[:checked]:text-saffron">
            <input type="checkbox" name={name} value={o} defaultChecked={selected.includes(o)} className="sr-only" />
            {o}
          </label>
        ))}
      </div>
    </div>
  );
}
