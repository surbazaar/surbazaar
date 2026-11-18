import { NextResponse, type NextRequest } from "next/server";
import { PDFDocument, StandardFonts, rgb, type PDFFont } from "pdf-lib";
import { createClient } from "@/lib/supabase/server";
import { LICENCE_FILES, LICENCES, type LicenceType } from "@/lib/constants";
import { date, pkr } from "@/lib/utils";

// Standard PDF fonts only cover Latin-1; replace anything else so generation never fails.
const clean = (s: string) => s.replace(/[^\x20-\x7E\xA0-\xFF]/g, "?");

function wrap(text: string, font: PDFFont, size: number, width: number) {
  const words = clean(text).split(" ");
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    const t = line ? `${line} ${w}` : w;
    if (font.widthOfTextAtSize(t, size) > width && line) {
      lines.push(line);
      line = w;
    } else line = t;
  }
  if (line) lines.push(line);
  return lines;
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.redirect(new URL("/login", request.url));

  // RLS limits this to the buyer, the producer or an admin.
  const { data: item } = await supabase
    .from("order_items")
    .select("beat_id, beat_title, producer_name, licence_type, price_pkr, licence_code, order:orders!inner(order_number, buyer_name, buyer_email, status, paid_at)")
    .eq("licence_code", code.toUpperCase())
    .maybeSingle();
  const order = item?.order as unknown as { order_number: string; buyer_name: string; buyer_email: string; status: string; paid_at: string } | undefined;
  if (!item || !order || order.status !== "paid") return new NextResponse("Licence not found", { status: 404 });

  const type = item.licence_type as LicenceType;
  const info = LICENCES[type];
  const pdf = await PDFDocument.create();
  pdf.setTitle(`SurBazaar licence ${item.licence_code}`);
  const page = pdf.addPage([595, 842]);
  const reg = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const ink = rgb(0.1, 0.08, 0.06);
  const muted = rgb(0.4, 0.36, 0.3);
  const saffron = rgb(0.85, 0.55, 0.12);
  const M = 56;
  const W = 595 - M * 2;
  let y = 842 - M;

  const text = (t: string, opts: { size?: number; font?: PDFFont; color?: ReturnType<typeof rgb>; x?: number } = {}) => {
    const size = opts.size ?? 10;
    const font = opts.font ?? reg;
    for (const l of wrap(t, font, size, W - ((opts.x ?? M) - M))) {
      page.drawText(l, { x: opts.x ?? M, y, size, font, color: opts.color ?? ink });
      y -= size * 1.45;
    }
  };

  page.drawRectangle({ x: 0, y: 842 - 8, width: 595, height: 8, color: saffron });
  text("SurBazaar", { size: 22, font: bold });
  text("Beat licence agreement", { size: 12, color: muted });
  y -= 12;
  text(info.name.toUpperCase(), { size: 16, font: bold, color: saffron });
  y -= 6;

  const rows: [string, string][] = [
    ["Licence code", item.licence_code],
    ["Beat", item.beat_title],
    ["Beat ID", item.beat_id],
    ["Producer (licensor)", item.producer_name],
    ["Licensee", order.buyer_name],
    ["Licensee email", order.buyer_email ?? "-"],
    ["Order", order.order_number],
    ["Fee paid", pkr(item.price_pkr)],
    ["Date issued", date(order.paid_at)],
    ["Files delivered", type === "free" ? "Tagged MP3" : LICENCE_FILES[type].map((f) => (f === "stems" ? "Stems" : f.toUpperCase())).join(", ")],
  ];
  for (const [k, v] of rows) {
    page.drawText(clean(k), { x: M, y, size: 10, font: bold, color: muted });
    page.drawText(clean(v), { x: M + 140, y, size: 10, font: reg, color: ink });
    y -= 16;
  }
  y -= 10;
  text("Terms", { size: 12, font: bold });
  y -= 2;
  for (const t of info.terms) {
    page.drawText("-", { x: M, y, size: 10, font: reg, color: saffron });
    text(t.replaceAll("{producer}", item.producer_name), { x: M + 12 });
    y -= 3;
  }
  y -= 8;
  text("General", { size: 12, font: bold });
  for (const t of [
    "The producer confirms the beat is their original work and that any samples used are cleared or royalty-free.",
    "This licence is personal to the licensee and may not be resold, sublicensed or transferred.",
    "The licensee may not register the beat itself (without new vocals or performance) with Content ID or any fingerprinting service.",
    "If this order is refunded, the licence ends and all use must stop.",
    "This licence is governed by the laws of Pakistan.",
  ]) {
    page.drawText("-", { x: M, y, size: 10, font: reg, color: saffron });
    text(t, { x: M + 12 });
    y -= 3;
  }

  const origin = request.nextUrl.origin;
  page.drawLine({ start: { x: M, y: 80 }, end: { x: 595 - M, y: 80 }, thickness: 0.5, color: muted });
  page.drawText(clean(`Verify this licence at ${origin}/verify?code=${item.licence_code}`), { x: M, y: 64, size: 9, font: reg, color: muted });
  page.drawText("Issued electronically by SurBazaar on behalf of the producer.", { x: M, y: 50, size: 9, font: reg, color: muted });

  const bytes = await pdf.save();
  return new NextResponse(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="SurBazaar-licence-${item.licence_code}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
