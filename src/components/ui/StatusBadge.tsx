import { Badge } from "./Badge";
import {
  submissionStatusLabel,
  paymentStatusLabel,
  cycleStatusLabel,
  apartmentStatusLabel,
} from "@/lib/i18n/he";

type Kind = "submission" | "payment" | "cycle" | "apartment";

const tones: Record<
  string,
  "neutral" | "info" | "success" | "warning" | "danger" | "brand"
> = {
  PENDING: "warning",
  APPROVED: "success",
  REJECTED: "danger",
  PAID: "success",
  CANCELLED: "neutral",
  OPEN: "success",
  CLOSED: "neutral",
  ACTIVE: "success",
  INACTIVE: "neutral",
};

function label(kind: Kind, status: string): string {
  switch (kind) {
    case "submission":
      return submissionStatusLabel(status);
    case "payment":
      return paymentStatusLabel(status);
    case "cycle":
      return cycleStatusLabel(status);
    case "apartment":
      return apartmentStatusLabel(status);
    default:
      return status;
  }
}

export function StatusBadge({ kind, status }: { kind: Kind; status: string }) {
  return (
    <Badge tone={tones[status] ?? "neutral"}>{label(kind, status)}</Badge>
  );
}
