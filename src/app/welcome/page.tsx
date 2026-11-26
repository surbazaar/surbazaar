import Link from "next/link";
import { requireUser } from "@/lib/auth";

export const metadata = { title: "Welcome" };

export default async function WelcomePage() {
  const { supabase, user, profile } = await requireUser("/welcome");
  const { data: producer } = await supabase.from("producer_profiles").select("status").eq("user_id", user.id).maybeSingle();
  const name = profile.display_name?.split(" ")[0] || "there";

  return (
    <div className="mx-auto max-w-3xl space-y-8 py-6">
      <div>
        <p className="text-xs font-semibold tracking-[0.25em] text-saffron uppercase">Account ready</p>
        <h1 className="h-display mt-2 text-4xl">Welcome to SurBazaar, {name}!</h1>
        <p className="mt-2 text-muted">What would you like to do first?</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Link href="/beats" className="card group p-6 transition hover:border-saffron">
          <div className="text-3xl">🎧</div>
          <h2 className="mt-3 text-xl font-semibold group-hover:text-saffron">I want to buy beats</h2>
          <p className="mt-2 text-sm text-muted">
            Browse by genre, mood and BPM. Pay in PKR and get your files plus a licence PDF.
          </p>
          <span className="btn-primary mt-5">Browse beats →</span>
        </Link>

        <Link href={producer?.status === "approved" ? "/studio" : "/sell"} className="card group p-6 transition hover:border-saffron">
          <div className="text-3xl">🎹</div>
          <h2 className="mt-3 text-xl font-semibold group-hover:text-saffron">I make beats</h2>
          <p className="mt-2 text-sm text-muted">
            {producer
              ? producer.status === "approved"
                ? "You're approved. Upload beats and track your sales."
                : `Your producer application is ${producer.status}. You can view or update it.`
              : "Apply with a sample beat. Keep 80% of every sale, paid to JazzCash, Easypaisa or bank."}
          </p>
          <span className="btn-ghost mt-5">
            {producer?.status === "approved" ? "Open studio →" : producer ? "View application →" : "Apply as a producer →"}
          </span>
        </Link>
      </div>

      <p className="text-sm text-muted">
        You can always reach these from the top menu: <b className="text-sand">Beats</b>, <b className="text-sand">Sell beats</b>,
        and <b className="text-sand">My licences</b> for your purchases.
      </p>
    </div>
  );
}
