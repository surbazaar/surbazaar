import Link from "next/link";

export const metadata = { title: "Confirm your email" };

export default async function CheckEmailPage({ searchParams }: { searchParams: Promise<{ email?: string }> }) {
  const { email } = await searchParams;
  return (
    <div className="mx-auto max-w-md py-10 text-center">
      <div className="text-5xl">📩</div>
      <h1 className="h-display mt-4 text-3xl">Check your email</h1>
      <p className="mt-3 text-muted">
        We sent a confirmation link to {email ? <b className="text-sand">{email}</b> : "your inbox"}. Click it to activate
        your account. You&apos;ll land straight on your welcome page.
      </p>
      <div className="card mt-6 p-4 text-left text-sm text-muted">
        <b className="text-sand">Didn&apos;t get it?</b>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>Check your Spam or Promotions folder.</li>
          <li>Wait a minute — it can take a little time.</li>
          <li>Already confirmed? <Link href="/login?next=/welcome" className="link">Sign in here</Link>.</li>
        </ul>
      </div>
    </div>
  );
}
