"use client";
import { motion } from "framer-motion";
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
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className={className}
    >
      <Card className="border-dashed bg-muted/30 relative overflow-hidden">
        {/* Subtle decorative arc — adds visual weight without distraction */}
        <div
          aria-hidden
          className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-primary/15 to-transparent"
        />
        <CardContent className="flex flex-col items-center text-center py-10 px-6 gap-3">
          {Icon && (
            <div className="relative">
              <div
                aria-hidden
                className="absolute inset-0 rounded-full bg-primary/5 blur-md"
              />
              <div className="relative size-14 rounded-full bg-card flex items-center justify-center shadow-sm ring-1 ring-border">
                <Icon className="size-6 text-muted-foreground" />
              </div>
            </div>
          )}
          <p className="text-base font-semibold">{title}</p>
          {description && (
            <p className="text-sm text-muted-foreground max-w-md leading-relaxed">
              {description}
            </p>
          )}
          {action && <div className="mt-2">{action}</div>}
        </CardContent>
      </Card>
    </motion.div>
  );
}
