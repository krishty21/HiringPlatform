"use client";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "default",
  className,
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
  icon?: LucideIcon;
  tone?: "default" | "primary" | "accent" | "success";
  className?: string;
}) {
  const toneCls = {
    default: "bg-card text-foreground",
    primary: "bg-primary text-primary-foreground",
    accent: "bg-accent text-accent-foreground",
    success: "bg-emerald-100 text-emerald-900",
  }[tone];
  const iconBg = tone === "default"
    ? "bg-primary/10 text-primary"
    : tone === "success"
      ? "bg-emerald-200/50 text-emerald-800"
      : "bg-black/10 text-current";
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      whileHover={{ y: -2 }}
      className="h-full"
    >
      <Card
        className={cn(
          toneCls,
          "border relative overflow-hidden transition-shadow hover:shadow-md h-full",
          className,
        )}
      >
        {/* Subtle decorative corner glow (non-interactive) */}
        <div
          aria-hidden
          className={cn(
            "absolute -right-8 -top-8 size-24 rounded-full blur-2xl pointer-events-none",
            tone === "default" ? "bg-primary/5" : "bg-black/5",
          )}
        />
        <CardContent className="relative p-5 flex items-start gap-4">
          {Icon && (
            <div
              className={cn(
                "size-10 rounded-lg flex items-center justify-center shrink-0 ring-1 ring-inset",
                iconBg,
                tone === "default" ? "ring-primary/15" : "ring-black/10",
              )}
            >
              <Icon className="size-5" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium opacity-80 truncate">{label}</p>
            <p className="text-2xl font-bold tabular-nums mt-1 leading-none">
              {value}
            </p>
            {hint && (
              <p className="text-xs opacity-70 mt-2 truncate">{hint}</p>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
