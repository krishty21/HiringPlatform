import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <Card className={cn("border-dashed bg-muted/40", className)}>
      <CardContent className="flex flex-col items-center text-center py-10 px-6 gap-3">
        {Icon && <div className="size-12 rounded-full bg-card flex items-center justify-center shadow-sm"><Icon className="size-6 text-muted-foreground" /></div>}
        <p className="text-base font-semibold">{title}</p>
        {description && <p className="text-sm text-muted-foreground max-w-md">{description}</p>}
        {action && <div className="mt-2">{action}</div>}
      </CardContent>
    </Card>
  );
}
