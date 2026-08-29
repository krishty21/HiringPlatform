"use client";
import { useLanguage, type LanguageCode } from "@/lib/i18n/LanguageProvider";
import { Button } from "@/components/ui/button";
import { Languages } from "lucide-react";
import { useState, useRef, useEffect } from "react";

const LANGS: { code: LanguageCode; label: string; native: string }[] = [
  { code: "en", label: "English", native: "English" },
  { code: "hi", label: "Hindi", native: "हिन्दी" },
  { code: "te", label: "Telugu", native: "తెలుగు" },
];

export function LanguageToggle({ compact = false }: { compact?: boolean }) {
  const { lang, setLang, t } = useLanguage();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const current = LANGS.find(l => l.code === lang) ?? LANGS[0];

  if (compact) {
    return (
      <div ref={ref} className="relative">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-2 min-h-11"
          aria-label={t("navLanguage")}
          aria-expanded={open}
          onClick={() => setOpen(o => !o)}
        >
          <Languages className="size-4" />
          <span className="text-sm font-medium">{current.native}</span>
        </Button>
        {open && (
          <div className="absolute right-0 mt-2 z-50 min-w-44 rounded-lg border border-border bg-popover shadow-lg p-1 animate-fade-in" role="menu">
            {LANGS.map(l => (
              <button
                key={l.code}
                type="button"
                role="menuitemradio"
                aria-checked={l.code === lang}
                onClick={() => { setLang(l.code); setOpen(false); }}
                className={`w-full flex items-center justify-between rounded-md px-3 py-2 text-sm hover:bg-accent transition-colors ${l.code === lang ? "bg-accent text-accent-foreground" : ""}`}
              >
                <span>{l.native}</span>
                <span className="text-xs text-muted-foreground">{l.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="inline-flex rounded-full border border-border bg-card p-1 gap-1" role="radiogroup" aria-label="Language">
      {LANGS.map(l => (
        <button
          key={l.code}
          type="button"
          role="radio"
          aria-checked={l.code === lang}
          onClick={() => setLang(l.code)}
          className={`px-4 py-2 rounded-full text-sm font-medium transition-colors min-h-10 ${l.code === lang ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
        >
          {l.native}
        </button>
      ))}
    </div>
  );
}
