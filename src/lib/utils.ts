export function pkr(n: number | null | undefined) {
  if (n == null) return "—";
  if (n === 0) return "Free";
  return "PKR " + n.toLocaleString("en-PK");
}

export function date(d: string | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Karachi" });
}

export function publicUrl(path: string | null | undefined) {
  if (!path) return null;
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/previews/${path}`;
}

export function slugify(s: string) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

export function cx(...c: (string | false | null | undefined)[]) {
  return c.filter(Boolean).join(" ");
}

/** Turn a Supabase/Postgres error into a short user-facing message. */
export function errMsg(e: unknown) {
  if (!e) return "Something went wrong";
  if (typeof e === "string") return e;
  const m = (e as { message?: string }).message ?? "Something went wrong";
  if (m.includes("duplicate key") && m.includes("slug")) return "That store link is already taken.";
  if (m.includes("cnic")) return "CNIC must look like 42101-1234567-1.";
  return m;
}

/** Always shows an amount (0 → "PKR 0"), for balances. */
export function money(n: number | null | undefined) {
  return "PKR " + (n ?? 0).toLocaleString("en-PK");
}
