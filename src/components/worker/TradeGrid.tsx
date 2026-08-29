"use client";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { cn } from "@/lib/utils";
import {
  Zap, Wrench, Flame, Cpu, Settings, Truck, Hammer, BrickWall, Check, type LucideIcon,
} from "lucide-react";
import type { Skill } from "@/lib/schemas";

// Trade → icon mapping per directive
const CATEGORY_ICON: Record<string, LucideIcon> = {
  electrical: Zap,
  plumbing: Wrench,
  welding: Flame,
  machining: Cpu,
  mechanical: Settings,
  logistics: Truck,
  carpentry: Hammer,
  masonry: BrickWall,
  general: Settings,
};

function iconFor(skill: Skill): LucideIcon {
  return CATEGORY_ICON[skill.category] ?? Settings;
}

export function TradeGrid({
  skills,
  selected,
  onSelect,
}: {
  skills: Skill[];
  selected: string | null;
  onSelect: (id: string) => void;
}) {
  const { t, lang } = useLanguage();

  // Group by category for the grid (show only the "trade" skills)
  const grouped: Record<string, Skill[]> = {};
  for (const s of skills) {
    (grouped[s.category] ??= []).push(s);
  }

  return (
    <div className="grid gap-4">
      {Object.entries(grouped).map(([cat, list]) => {
        const Icon = CATEGORY_ICON[cat] ?? Settings;
        return (
          <div key={cat} className="grid gap-2">
            <p className="text-meta font-semibold uppercase tracking-wide text-ink-subtle flex items-center gap-1.5">
              <Icon className="size-3.5" aria-hidden />
              {cat}
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {list.map(s => {
                const active = selected === s.id;
                const Ic = iconFor(s);
                const name = lang === "hi" ? s.nameHi : lang === "te" ? s.nameTe : s.nameEn;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => onSelect(s.id)}
                    aria-pressed={active}
                    className={cn(
                      "flex flex-col items-start gap-1.5 p-3 rounded-md border min-h-20 text-left transition-colors",
                      active
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-surface text-ink-muted hover:text-ink hover:border-ink/30 border-border",
                    )}
                  >
                    <div className="flex items-center justify-between w-full">
                      <Ic className="size-5" aria-hidden />
                      {active && <Check className="size-4" aria-hidden />}
                    </div>
                    <span className="text-sm font-semibold leading-tight">{name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
