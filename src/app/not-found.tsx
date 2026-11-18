import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-md py-20 text-center">
      <p className="h-display text-6xl text-saffron">404</p>
      <p className="mt-3 text-muted">This page went off-beat.</p>
      <Link href="/beats" className="btn-primary mt-6">Browse beats</Link>
    </div>
  );
}
