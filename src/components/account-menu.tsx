"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

type Props = {
  name: string;
  email: string | null;
  role: "buyer" | "producer" | "admin";
  producerStatus: string | null;
  signOut: () => Promise<void>;
};

export function AccountMenu({ name, email, role, producerStatus, signOut }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  // Close when navigating or clicking outside
  const [lastPath, setLastPath] = useState(pathname);
  if (pathname !== lastPath) {
    setLastPath(pathname);
    setOpen(false);
  }
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const initial = (name || email || "?").trim().charAt(0).toUpperCase();
  const item = "block rounded-lg px-3 py-2 text-sm text-sand hover:bg-panel-2 hover:text-saffron";

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="flex items-center gap-2 rounded-full border border-line py-1 pr-3 pl-1 hover:border-saffron"
      >
        <span className="grid h-7 w-7 place-items-center rounded-full bg-saffron text-sm font-bold text-ink">{initial}</span>
        <span className="hidden max-w-28 truncate text-sm sm:block">{name || "Account"}</span>
        <svg viewBox="0 0 20 20" className="h-4 w-4 text-muted" fill="currentColor"><path d="M5.5 7.5 10 12l4.5-4.5" stroke="currentColor" strokeWidth="1.5" fill="none" /></svg>
      </button>

      {open && (
        <div role="menu" className="card absolute right-0 z-50 mt-2 w-60 p-2 shadow-2xl shadow-black/50">
          <div className="border-b border-line px-3 pt-1 pb-3">
            <div className="truncate font-semibold">{name}</div>
            <div className="truncate text-xs text-muted">{email}</div>
          </div>
          <div className="py-1">
            <Link href="/account" className={item}>My account</Link>
            <Link href="/orders" className={item}>My licences</Link>
            <Link href="/cart" className={item}>Cart</Link>
          </div>
          <div className="border-t border-line py-1">
            {role === "producer" || producerStatus === "approved" ? (
              <>
                <Link href="/studio" className={item}>Studio</Link>
                <Link href="/studio/wallet" className={item}>Wallet & payouts</Link>
              </>
            ) : (
              <Link href="/sell" className={item}>
                {producerStatus ? `Producer application (${producerStatus})` : "Become a producer"}
              </Link>
            )}
            {role === "admin" && <Link href="/admin" className={`${item} text-saffron`}>Admin panel</Link>}
          </div>
          <form action={signOut} className="border-t border-line pt-1">
            <button className="w-full rounded-lg px-3 py-2 text-left text-sm text-muted hover:bg-panel-2 hover:text-henna">
              Sign out
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
