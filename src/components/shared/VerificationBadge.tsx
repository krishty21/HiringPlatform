import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Clock, XCircle } from "lucide-react";

type Status = "pending" | "approved" | "rejected";

const STYLES: Record<Status, { cls: string; icon: typeof CheckCircle2 }> = {
  pending: { cls: "bg-amber-100 text-amber-800 border-amber-300", icon: Clock },
  approved: { cls: "bg-emerald-100 text-emerald-800 border-emerald-300", icon: CheckCircle2 },
  rejected: { cls: "bg-rose-100 text-rose-800 border-rose-300", icon: XCircle },
};

export function VerificationBadge({ status, label }: { status: Status; label?: string }) {
  const s = STYLES[status];
  const Icon = s.icon;
  return (
    <Badge variant="outline" className={`${s.cls} border`}>
      <Icon className="size-3" />
      {label ?? status}
    </Badge>
  );
}
