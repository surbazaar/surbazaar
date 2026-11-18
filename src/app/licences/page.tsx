import { LICENCE_ORDER, LICENCES } from "@/lib/constants";
import { pkr } from "@/lib/utils";

export const metadata = { title: "Licence types" };

export default function LicencesPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="h-display text-4xl">Licence types</h1>
        <p className="mt-2 max-w-2xl text-muted">
          Every beat on SurBazaar is sold under one of these standard licences. Producers set the price within the
          suggested range. Your licence PDF lists the exact terms, your name and a code anyone can verify.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {LICENCE_ORDER.map((t) => {
          const l = LICENCES[t];
          return (
            <div key={t} className="card p-6">
              <h2 className="h-display text-2xl">{l.name}</h2>
              <p className="mt-1 text-sm text-saffron">
                {t === "free" ? "Free" : `${pkr(l.range[0])}${t === "exclusive" ? "+" : ` – ${pkr(l.range[1])}`}`} · {l.files}
              </p>
              <ul className="mt-4 list-disc space-y-1 pl-5 text-sm text-muted">
                {l.terms.map((x) => <li key={x}>{x.replace("{producer}", "Producer")}</li>)}
              </ul>
            </div>
          );
        })}
      </div>
      <p className="text-xs text-muted">
        These are summary terms for the MVP and should be reviewed by a lawyer before public launch.
      </p>
    </div>
  );
}
