import Link from "next/link";

export default function StudioLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-6">
      <nav className="flex flex-wrap gap-2 border-b border-line pb-4 text-sm">
        <span className="h-display mr-3 text-xl">Studio</span>
        <Link href="/studio" className="btn-ghost">Beats</Link>
        <Link href="/studio/upload" className="btn-ghost">Upload</Link>
        <Link href="/studio/sales" className="btn-ghost">Sales</Link>
        <Link href="/studio/wallet" className="btn-ghost">Wallet & payouts</Link>
      </nav>
      {children}
    </div>
  );
}
