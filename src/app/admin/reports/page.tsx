import Link from "next/link";
import { ActionForm } from "@/components/forms";
import { reportAction } from "@/app/actions/admin";
import { requireAdmin } from "@/lib/auth";
import { REPORT_REASONS } from "@/lib/constants";
import { date } from "@/lib/utils";

export const metadata = { title: "Reports · Admin" };

export default async function AdminReports() {
  const { supabase } = await requireAdmin();
  const { data: reports } = await supabase
    .from("reports")
    .select("*, beat:beats(id, title, status, producer:producer_profiles(stage_name))")
    .eq("status", "open")
    .order("created_at");

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">Target: respond within 48 hours. Take the beat down while you investigate serious copyright claims.</p>
      {!reports?.length && <p className="card p-8 text-center text-muted">No open reports.</p>}
      {reports?.map((r) => (
        <div key={r.id} className="card space-y-2 p-5">
          <div className="flex flex-wrap items-baseline gap-3">
            <Link href={`/beats/${r.beat?.id}`} className="font-semibold hover:text-saffron">{r.beat?.title}</Link>
            <span className="text-sm text-muted">by {r.beat?.producer?.stage_name} · beat is {r.beat?.status}</span>
          </div>
          <p className="text-sm"><b className="text-henna">{REPORT_REASONS.find((x) => x.value === r.reason)?.label}</b> — reported {date(r.created_at)} by {r.reporter_email ?? "anonymous"}</p>
          {r.details && <p className="whitespace-pre-line text-sm text-muted">{r.details}</p>}
          <ActionForm action={reportAction} className="flex flex-wrap items-center gap-2 border-t border-line pt-3 text-sm">
            <input type="hidden" name="report_id" value={r.id} />
            <input type="hidden" name="beat_id" value={r.beat?.id} />
            <input name="note" placeholder="Note" className="input max-w-xs" />
            <label className="flex items-center gap-1"><input type="checkbox" name="takedown" className="accent-saffron" /> Take beat down</label>
            <button name="status" value="resolved" className="btn-primary">Resolve</button>
            <button name="status" value="dismissed" className="btn-ghost">Dismiss</button>
          </ActionForm>
        </div>
      ))}
    </div>
  );
}
