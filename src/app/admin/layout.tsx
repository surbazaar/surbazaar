import Link from "next/link";
import { requireAdmin } from "@/lib/auth";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return (
    <div className="space-y-6">
      <nav className="flex flex-wrap gap-2 border-b border-line pb-4 text-sm">
        <span className="h-display mr-3 text-xl text-saffron">Admin</span>
        {[["", "Overview"], ["producers", "Producers"], ["beats", "Beat review"], ["orders", "Orders"], ["payouts", "Payouts"], ["reports", "Reports"], ["settings", "Payment settings"]].map(([p, l]) => (
          <Link key={p} href={`/admin/${p}`} className="btn-ghost">{l}</Link>
        ))}
      </nav>
      {children}
    </div>
  );
}
