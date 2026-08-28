"use client";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { Mic, Square, Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";

// Minimal Web Speech API typings (TS doesn't ship them)
interface SpeechRecognitionResultLike { transcript: string; confidence: number; }
interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: ArrayLike<{ 0: SpeechRecognitionResultLike }>;
}
interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((ev: SpeechRecognitionEventLike) => void) | null;
  onerror: ((ev: unknown) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
}

type Ctor = new () => SpeechRecognitionLike;

export interface VoiceButtonProps {
  lang: "en" | "hi" | "te";
  onTranscript: (transcript: string) => void;
}

// Map our app language code to a BCP-47 region for the Web Speech API.
const BCP47: Record<"en" | "hi" | "te", string> = {
  en: "en-IN",
  hi: "hi-IN",
  te: "te-IN",
};

export function VoiceButton({ lang, onTranscript }: VoiceButtonProps) {
  const { t } = useLanguage();
  const [listening, setListening] = useState(false);
  const [busy, setBusy] = useState(false);
  // Lazy initial state — runs once on the client; safe during SSR (defaults to true).
  const [supported] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    const w = window as unknown as { SpeechRecognition?: Ctor; webkitSpeechRecognition?: Ctor };
    return !!(w.SpeechRecognition ?? w.webkitSpeechRecognition);
  });
  const recRef = useRef<SpeechRecognitionLike | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const w = window as unknown as {
      SpeechRecognition?: Ctor;
      webkitSpeechRecognition?: Ctor;
    };
    const CtorImpl = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!CtorImpl) {
      // supported state is computed lazily; nothing to do here.
      return;
    }
    const rec = new CtorImpl();
    rec.lang = BCP47[lang] ?? "en-IN";
    rec.continuous = false;
    rec.interimResults = false;

    rec.onstart = () => setListening(true);
    rec.onend = () => setListening(false);
    rec.onerror = () => {
      setListening(false);
      setBusy(false);
    };
    rec.onresult = (ev: SpeechRecognitionEventLike) => {
      const last = ev.results[ev.results.length - 1];
      const transcript = last?.[0]?.transcript ?? "";
      if (transcript.trim().length > 0) {
        setBusy(true);
        onTranscript(transcript.trim());
      }
    };

    recRef.current = rec;
    return () => {
      try { rec.stop(); } catch {}
      recRef.current = null;
    };
  }, [lang, onTranscript]);

  function toggle() {
    if (!supported) {
      toast.error(t("onboardVoiceUnsupported"));
      return;
    }
    const rec = recRef.current;
    if (!rec) return;
    if (listening) {
      try { rec.stop(); } catch {}
      setListening(false);
      return;
    }
    setBusy(false);
    try {
      rec.lang = BCP47[lang] ?? "en-IN";
      rec.start();
    } catch {
      // already started
    }
  }

  if (!supported) {
    return (
      <Card className="border-amber-300/60 bg-amber-50">
        <CardContent className="p-4 flex items-start gap-3 text-sm">
          <AlertCircle className="size-5 text-amber-700 shrink-0 mt-0.5" />
          <p className="text-amber-900">{t("onboardVoiceUnsupported")}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-accent/40 bg-accent/5">
      <CardContent className="p-4 flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex flex-col">
            <p className="text-sm font-semibold flex items-center gap-2">
              <Mic className="size-4 text-accent-foreground" />
              {t("onboardVoice")}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {BCP47[lang]}
            </p>
          </div>
          <Button
            type="button"
            onClick={toggle}
            variant={listening ? "destructive" : "default"}
            className="gap-2 min-h-11"
            aria-pressed={listening}
          >
            {busy ? <Loader2 className="size-4 animate-spin" /> : listening ? <Square className="size-4" /> : <Mic className="size-4" />}
            {busy ? t("loading") : listening ? t("onboardVoiceStop") : t("onboardVoiceStart")}
          </Button>
        </div>
        {listening && (
          <div className="flex items-center gap-2 text-xs text-accent-foreground">
            <span className="inline-block size-2 rounded-full bg-accent animate-pulse" />
            {t("onboardVoiceListening")}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
