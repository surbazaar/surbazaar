export const metadata = { title: "Terms & content rules" };

export default function TermsPage() {
  return (
    <article className="mx-auto max-w-2xl space-y-6 text-sm leading-relaxed text-muted">
      <h1 className="h-display text-4xl text-sand">Terms & content rules</h1>
      <p className="rounded-xl border border-saffron/40 p-4 text-saffron">
        Draft for the MVP. Have these reviewed by a Pakistani lawyer (copyright and contracts) before public launch.
      </p>
      <section>
        <h2 className="text-lg font-semibold text-sand">Producer agreement (summary)</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>You confirm you own every beat you upload, and all samples are cleared or royalty-free.</li>
          <li>You grant SurBazaar the right to sell licences for your beats on the terms shown on the licence page.</li>
          <li>You accept liability if a claim of ownership turns out to be false. Repeat offenders are banned.</li>
          <li>You keep 80% of each sale on the free plan (founding producers: 100% for the first 6 months).</li>
          <li>Earnings are held for 7 days, then can be withdrawn once your balance reaches PKR 2,000. Payouts run weekly.</li>
        </ul>
      </section>
      <section>
        <h2 className="text-lg font-semibold text-sand">Content rules</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>No uncleared samples from Bollywood, Coke Studio or other commercial songs. Covers and remixes of copyrighted songs are not allowed.</li>
          <li>&quot;Type beat&quot; tags are allowed, but you may not use an artist&apos;s vocals, use their name in artwork, or imply endorsement.</li>
          <li>AI-generated music must be declared, and is listed only if the tool&apos;s terms grant commercial rights.</li>
          <li>Preview MP3s must carry an audible voice tag. Full-quality files stay private and are delivered only to licensed buyers.</li>
        </ul>
      </section>
      <section>
        <h2 className="text-lg font-semibold text-sand">Takedowns and disputes</h2>
        <p className="mt-2">
          Use the &quot;Report this beat&quot; link on any beat page. We review reports within 48 hours and may remove a
          beat while we investigate. Buyers affected by a confirmed claim are refunded.
        </p>
      </section>
      <section>
        <h2 className="text-lg font-semibold text-sand">Privacy</h2>
        <p className="mt-2">
          We store your name, email and order history. Producer CNIC and payout details are visible only to the
          producer and SurBazaar admins, and are used for verification and payouts.
        </p>
      </section>
    </article>
  );
}
