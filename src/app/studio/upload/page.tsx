import { requireProducer } from "@/lib/auth";
import { UploadForm } from "./upload-form";

export const metadata = { title: "Upload a beat" };

export default async function UploadPage() {
  const { user } = await requireProducer();
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <h1 className="h-display text-3xl">Upload a beat</h1>
      <p className="text-sm text-muted">Every upload is checked by our team before it goes live (usually within 24 hours).</p>
      <UploadForm userId={user.id} />
    </div>
  );
}
