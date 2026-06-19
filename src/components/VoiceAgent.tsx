import { useEffect, useRef, useState } from "react";
import { Mic, Square, Volume2, AlertCircle } from "lucide-react";
import RealityPill from "./RealityPill";

/**
 * Free, open in-browser voice agent — no account, no cost.
 * STT + VAD: the Web Speech API (SpeechRecognition) handles microphone capture
 * and end-of-speech detection. TTS: speechSynthesis reads the proposal aloud.
 * The captured intent + rationale is surfaced for the human to confirm in the
 * gated review form (voice never auto-finalizes — that stays a human action).
 */

interface VoiceAgentProps {
  proposal: string;
  onCapture?: (decision: "approved" | "rejected" | "approved_with_edits", rationale: string) => void;
}

type Recognition = any;

function getRecognition(): Recognition | null {
  const w = window as any;
  const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition;
  return Ctor ? new Ctor() : null;
}

function detectDecision(text: string): "approved" | "rejected" | "approved_with_edits" {
  const t = text.toLowerCase();
  if (/\b(reject|deny|decline|no|against)\b/.test(t)) return "rejected";
  if (/\b(edit|change|modify|adjust|but|condition)\b/.test(t)) return "approved_with_edits";
  return "approved";
}

export default function VoiceAgent({ proposal, onCapture }: VoiceAgentProps) {
  const [supported, setSupported] = useState(true);
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [decision, setDecision] = useState<string | null>(null);
  const recRef = useRef<Recognition | null>(null);

  useEffect(() => {
    setSupported(!!getRecognition() && typeof window.speechSynthesis !== "undefined");
    return () => {
      try {
        recRef.current?.stop?.();
        window.speechSynthesis?.cancel?.();
      } catch {
        /* noop */
      }
    };
  }, []);

  const speak = (text: string) => {
    try {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.rate = 1.02;
      window.speechSynthesis.speak(u);
    } catch {
      /* noop */
    }
  };

  const briefAndListen = () => {
    speak(
      `The recommended option is ${proposal}. After the beep, say whether you approve, approve with edits, or reject, and your reason.`
    );
    const rec = getRecognition();
    if (!rec) {
      setSupported(false);
      return;
    }
    rec.lang = "en-US";
    rec.interimResults = true;
    rec.continuous = false;
    rec.onresult = (e: any) => {
      let text = "";
      for (let i = 0; i < e.results.length; i++) text += e.results[i][0].transcript;
      setTranscript(text);
    };
    rec.onend = () => {
      setListening(false);
      setTranscript((t) => {
        if (t.trim()) {
          const d = detectDecision(t);
          setDecision(d);
          onCapture?.(d, t.trim());
        }
        return t;
      });
    };
    rec.onerror = () => setListening(false);
    recRef.current = rec;
    // Give the spoken brief a moment before opening the mic.
    setTimeout(() => {
      try {
        rec.start();
        setListening(true);
        setDecision(null);
        setTranscript("");
      } catch {
        setListening(false);
      }
    }, 2600);
  };

  const stop = () => {
    try {
      recRef.current?.stop?.();
    } catch {
      /* noop */
    }
    setListening(false);
  };

  return (
    <div className="bg-surface-solid border border-border-line rounded-2xl p-5 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold text-muted uppercase tracking-widest flex items-center gap-2">
          <Volume2 className="w-3.5 h-3.5" />
          Voice review · free in-browser agent
        </h3>
        <RealityPill
          kind={supported ? "live" : "unavailable"}
          label={supported ? "Live · in-browser" : "Unavailable"}
          pulse={supported}
          title="Free Web Speech API — STT + TTS + VAD, no account or cost"
        />
      </div>

      {!supported ? (
        <div className="flex items-start gap-2 text-xs text-muted">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          Voice isn't available in this browser. Use Chrome/Edge, or decide in the form above.
        </div>
      ) : (
        <>
          <p className="text-xs text-muted leading-relaxed">
            Tap to hear the proposal read aloud, then speak your decision and reason. The agent transcribes it for you to confirm.
          </p>
          <div className="flex items-center gap-2">
            {!listening ? (
              <button
                onClick={briefAndListen}
                className="inline-flex items-center gap-2 bg-accent text-white hover:opacity-90 font-semibold text-xs px-4 py-2.5 rounded-full transition-all"
              >
                <Mic className="w-4 h-4" />
                Brief me & listen
              </button>
            ) : (
              <button
                onClick={stop}
                className="inline-flex items-center gap-2 bg-rose-500 text-white hover:opacity-90 font-semibold text-xs px-4 py-2.5 rounded-full transition-all"
              >
                <Square className="w-3.5 h-3.5 fill-current" />
                Stop
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
              </button>
            )}
          </div>

          {transcript && (
            <div className="p-3 rounded-xl bg-surface border border-border-line">
              <span className="text-[10px] font-bold text-muted uppercase tracking-wider">You said</span>
              <p className="text-xs text-ink mt-1 leading-relaxed">{transcript}</p>
              {decision && (
                <span
                  className={`inline-block mt-2 text-[10px] font-mono font-bold px-2 py-0.5 rounded border uppercase ${
                    decision === "rejected"
                      ? "bg-rose-500/10 text-rose-500 border-rose-500/20"
                      : decision === "approved_with_edits"
                      ? "bg-amber-500/10 text-amber-600 border-amber-500/20"
                      : "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                  }`}
                >
                  detected: {decision.replace(/_/g, " ")} — confirm in the form above
                </span>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
