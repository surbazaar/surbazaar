import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { PlayerProvider } from "@/components/player";
import { getSession } from "@/lib/auth";
import { signOut } from "@/app/actions/auth";

export const metadata: Metadata = {
  title: { default: "SurBazaar — Pakistan's beat marketplace", template: "%s · SurBazaar" },
  description:
    "Buy and sell beats with clear licences and local payments. Desi hip-hop, Punjabi, Sufi fusion and more from vetted Pakistani producers.",
};

async function Header() {
  const { user, profile, supabase } = await getSession();
  let cartCount = 0;
  if (user) {
    const { count } = await supabase.from("cart_items").select("*", { count: "exact", head: true });
    cartCount = count ?? 0;
  }
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-ink/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center gap-6 px-4 py-3">
        <Link href="/" className="h-display text-2xl">
          Sur<span className="text-saffron">Bazaar</span>
        </Link>
        <nav className="hidden items-center gap-5 text-sm text-muted md:flex">
          <Link href="/beats" className="hover:text-sand">Beats</Link>
          <Link href="/licences" className="hover:text-sand">Licences</Link>
          <Link href="/verify" className="hover:text-sand">Verify a licence</Link>
          <Link href="/sell" className="hover:text-sand">Sell beats</Link>
        </nav>
        <div className="ml-auto flex items-center gap-3 text-sm">
          {user ? (
            <>
              {profile?.role === "admin" && <Link href="/admin" className="btn-ghost">Admin</Link>}
              {profile?.role !== "buyer" && <Link href="/studio" className="btn-ghost">Studio</Link>}
              <Link href="/orders" className="hidden text-muted hover:text-sand sm:block">My licences</Link>
              <Link href="/cart" className="btn-ghost">
                Cart{cartCount > 0 && <span className="rounded-full bg-saffron px-1.5 text-xs text-ink">{cartCount}</span>}
              </Link>
              <form action={signOut}>
                <button className="text-muted hover:text-sand">Sign out</button>
              </form>
            </>
          ) : (
            <>
              <Link href="/login" className="text-muted hover:text-sand">Sign in</Link>
              <Link href="/signup" className="btn-primary">Join free</Link>
            </>
          )}
        </div>
      </div>
      <nav className="flex gap-5 overflow-x-auto px-4 pb-2 text-sm text-muted md:hidden">
        <Link href="/beats">Beats</Link>
        <Link href="/licences">Licences</Link>
        <Link href="/verify">Verify</Link>
        <Link href="/sell">Sell</Link>
        {user && <Link href="/orders">My licences</Link>}
      </nav>
    </header>
  );
}

function Footer() {
  return (
    <footer className="mt-24 border-t border-line pb-28">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 text-sm text-muted sm:grid-cols-3">
        <div>
          <div className="h-display text-xl text-sand">Sur<span className="text-saffron">Bazaar</span></div>
          <p className="mt-2">Original beats from Pakistani producers, licensed properly and paid for in PKR.</p>
        </div>
        <div className="space-y-1">
          <Link href="/licences" className="block hover:text-sand">Licence types</Link>
          <Link href="/verify" className="block hover:text-sand">Verify a licence</Link>
          <Link href="/terms" className="block hover:text-sand">Terms & content rules</Link>
        </div>
        <div className="space-y-1">
          <Link href="/sell" className="block hover:text-sand">Become a producer</Link>
          <Link href="/beats" className="block hover:text-sand">Browse beats</Link>
        </div>
      </div>
    </footer>
  );
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        <PlayerProvider>
          <Header />
          <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
          <Footer />
        </PlayerProvider>
      </body>
    </html>
  );
}
