"use client";
import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import { en, type Dictionary, type DictKey } from "./en";
import { hi } from "./hi";
import { te } from "./te";

export type LanguageCode = "en" | "hi" | "te";
const DICTS: Record<LanguageCode, Dictionary> = { en, hi, te };
const STORAGE_KEY = "Jobhunt.lang";

type Ctx = {
  lang: LanguageCode;
  setLang: (l: LanguageCode) => void;
  t: (key: DictKey, vars?: Record<string, string | number>) => string;
};

const LanguageContext = createContext<Ctx | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  // Lazy initial state reads localStorage once on the client; avoids setState-in-effect lint.
  const [lang, setLangState] = useState<LanguageCode>(() => {
    if (typeof window === "undefined") return "en";
    const saved = localStorage.getItem(STORAGE_KEY) as LanguageCode | null;
    if (saved && DICTS[saved]) return saved;
    const nav = navigator.language.slice(0, 2) as string;
    if (nav === "hi" || nav === "te") return nav;
    return "en";
  });

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const setLang = useCallback((l: LanguageCode) => {
    setLangState(l);
    if (typeof window !== "undefined") localStorage.setItem(STORAGE_KEY, l);
    document.documentElement.lang = l;
  }, []);

  const t = useCallback((key: DictKey, vars?: Record<string, string | number>) => {
    const dict = DICTS[lang] ?? en;
    let str: string = (dict[key] as string) ?? (en[key] as string) ?? key;
    if (vars) for (const [k, v] of Object.entries(vars)) str = str.replace(`{${k}}`, String(v));
    return str;
  }, [lang]);

  return <LanguageContext.Provider value={{ lang, setLang, t }}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within LanguageProvider");
  return ctx;
}
