const COLORS: Record<string, string> = {
  paid: "border-teal/60 text-teal",
  approved: "border-teal/60 text-teal",
  resolved: "border-teal/60 text-teal",
  pending_payment: "border-saffron/60 text-saffron",
  pending: "border-saffron/60 text-saffron",
  requested: "border-saffron/60 text-saffron",
  open: "border-saffron/60 text-saffron",
  rejected: "border-henna/60 text-henna",
  refunded: "border-henna/60 text-henna",
  cancelled: "border-line text-muted",
  removed: "border-line text-muted",
  dismissed: "border-line text-muted",
  sold_exclusive: "border-henna/60 text-henna",
  suspended: "border-henna/60 text-henna",
};

export function StatusBadge({ status }: { status: string }) {
  return <span className={`badge ${COLORS[status] ?? ""}`}>{status.replace("_", " ")}</span>;
}
