import Link from "next/link";
import { LICENCES, type LicenceType } from "@/lib/constants";
import { createClient } from "@/lib/supabase/server";
import { date } from "@/lib/utils";

export const metadata = { title: "Verify a licence" };

export default async function VerifyPage({ searchParams }: { searchParams: Promise<{ code?: string }> }) {
  const { code } = await searchParams;
  let result: { licence_code: string; licence_type: LicenceType; beat_title: string; producer_name: string; licensee: string; issued_at: string; valid: boolean } | null = null;
  if (code) {
    const supabase = await createClient();
    const { data } = await supabase.rpc("verify_licence", { p_code: code });
    result = data?.[0] ?? null;
  }
  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <h1 className="h-display text-4xl">Verify a licence</h1>
        <p className="mt-2 text-muted">
          Got a copyright claim or working with an artist? Enter the 12-character code printed on a SurBazaar licence.
        </p>
      </div>
      <form className="flex gap-2">
        <input name="code" defaultValue={code} required placeholder="e.g. 4405ADD5AD20" className="input font-mono uppercase" />
        <button className="btn-primary">Check</button>
      </form>
      {code && !result && <div className="card p-5 text-henna">No licence found with that code.</div>}
      {result && (
        <div className={`card p-6 ${result.valid ? "border-teal/60" : "border-henna/60"}`}>
          <p className={`text-sm font-bold ${result.valid ? "text-teal" : "text-henna"}`}>
            {result.valid ? "VALID LICENCE" : "REVOKED (order refunded)"}
          </p>
          <dl className="mt-4 grid grid-cols-[120px_1fr] gap-y-2 text-sm">
            <dt className="text-muted">Beat</dt><dd>{result.beat_title}</dd>
            <dt className="text-muted">Producer</dt><dd>{result.producer_name}</dd>
            <dt className="text-muted">Licensee</dt><dd>{result.licensee}</dd>
            <dt className="text-muted">Licence</dt><dd>{LICENCES[result.licence_type].name}</dd>
            <dt className="text-muted">Issued</dt><dd>{date(result.issued_at)}</dd>
            <dt className="text-muted">Code</dt><dd className="font-mono">{result.licence_code}</dd>
          </dl>
          <Link href="/licences" className="link mt-4 inline-block text-sm">What this licence allows</Link>
        </div>
      )}
    </div>
  );
}
