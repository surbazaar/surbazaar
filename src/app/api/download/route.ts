import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { LICENCE_FILES, MASTER_FILENAMES, type LicenceType } from "@/lib/constants";
import { publicUrl, slugify } from "@/lib/utils";

/** Issues a short-lived signed URL for a file the signed-in buyer is licensed to download. */
export async function GET(request: NextRequest) {
  const item = request.nextUrl.searchParams.get("item") ?? "";
  const file = request.nextUrl.searchParams.get("file") ?? "";
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.redirect(new URL("/login", request.url));

  const { data: row } = await supabase
    .from("order_items")
    .select("beat_id, producer_id, beat_title, licence_type, order:orders!inner(buyer_id, status), beat:beats(preview_path)")
    .eq("id", item)
    .maybeSingle();
  const order = row?.order as unknown as { buyer_id: string; status: string } | undefined;
  if (!row || !order || order.buyer_id !== auth.user.id || order.status !== "paid") {
    return new NextResponse("Not found", { status: 404 });
  }

  const name = slugify(row.beat_title) || "beat";
  if (file === "preview") {
    const url = publicUrl((row.beat as unknown as { preview_path: string | null })?.preview_path);
    if (!url) return new NextResponse("Not found", { status: 404 });
    return NextResponse.redirect(`${url}?download=${name}-tagged.mp3`);
  }

  const allowed = LICENCE_FILES[row.licence_type as LicenceType] as string[];
  if (!allowed.includes(file)) return new NextResponse("Not included in your licence", { status: 403 });
  const key = MASTER_FILENAMES[file as keyof typeof MASTER_FILENAMES];
  const ext = key.split(".").pop();
  const { data, error } = await supabase.storage
    .from("masters")
    .createSignedUrl(`${row.producer_id}/${row.beat_id}/${key}`, 300, { download: `${name}-${file}.${ext}` });
  if (error || !data) return new NextResponse("File unavailable. Please contact support.", { status: 404 });
  return NextResponse.redirect(data.signedUrl);
}
