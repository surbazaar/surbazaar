import Link from "next/link";
import { ActionForm, Submit } from "@/components/forms";
import { signIn } from "@/app/actions/auth";

export const metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const { next = "/", error } = await searchParams;
  return (
    <div className="mx-auto max-w-sm">
      <h1 className="h-display text-3xl">Sign in</h1>
      {error && <p className="mt-3 text-sm text-henna">That link has expired or was already used. Please sign in.</p>}
      <ActionForm action={signIn} className="card mt-6 space-y-4 p-6">
        <input type="hidden" name="next" value={next} />
        <div>
          <label className="label" htmlFor="email">Email</label>
          <input id="email" name="email" type="email" required className="input" autoComplete="email" />
        </div>
        <div>
          <label className="label" htmlFor="password">Password</label>
          <input id="password" name="password" type="password" required className="input" autoComplete="current-password" />
        </div>
        <Submit className="btn-primary w-full">Sign in</Submit>
      </ActionForm>
      <div className="mt-4 flex justify-between text-sm">
        <Link href={`/signup?next=${encodeURIComponent(next)}`} className="link">Create account</Link>
        <Link href="/forgot" className="text-muted hover:text-sand">Forgot password?</Link>
      </div>
    </div>
  );
}
