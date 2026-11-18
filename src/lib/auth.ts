import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type Role = "buyer" | "producer" | "admin";
export type Profile = { id: string; display_name: string; email: string | null; role: Role };

/** Current user + profile for this request (null when signed out). */
export const getSession = cache(async () => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return { supabase, user: null, profile: null as Profile | null };
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, display_name, email, role")
    .eq("id", data.user.id)
    .single<Profile>();
  return { supabase, user: data.user, profile };
});

export async function requireUser(next = "/") {
  const s = await getSession();
  if (!s.user || !s.profile) redirect(`/login?next=${encodeURIComponent(next)}`);
  return { supabase: s.supabase, user: s.user, profile: s.profile };
}

export async function requireAdmin() {
  const s = await requireUser("/admin");
  if (s.profile.role !== "admin") redirect("/");
  return s;
}

export async function requireProducer() {
  const s = await requireUser("/studio");
  const { data: producer } = await s.supabase
    .from("producer_profiles")
    .select("*")
    .eq("user_id", s.user.id)
    .maybeSingle();
  if (!producer || producer.status !== "approved") redirect("/sell");
  return { ...s, producer };
}
