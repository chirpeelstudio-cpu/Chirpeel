import { useCallback, useEffect, useRef, useState } from "react";

// ---- Web Speech API typing ----
type SpeechRecCtor = new () => SpeechRecInstance;
type SpeechRecInstance = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort?: () => void;
  onresult: ((e: SpeechRecResultEvent) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: { error?: string }) => void) | null;
  onstart?: (() => void) | null;
};
type SpeechRecResultEvent = {
  resultIndex: number;
  results: ArrayLike<
    ArrayLike<{ transcript: string }> & { isFinal: boolean }
  >;
};

function getSpeechRec(): SpeechRecCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecCtor;
    webkitSpeechRecognition?: SpeechRecCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export type VoiceState = "idle" | "listening" | "thinking" | "speaking";

export type MicDenyReason =
  | "denied"
  | "dismissed"
  | "no-device"
  | "iframe-blocked"
  | "insecure"
  | "unsupported"
  | "unknown";

export type StartResult =
  | { ok: true }
  | { ok: false; reason: MicDenyReason; message?: string };

export interface VoiceConversationOptions {
  onAutoSend: (text: string) => void;
  silenceMs?: number;
  lang?: string;
}

export interface VoiceConversationApi {
  supported: boolean;
  active: boolean;
  state: VoiceState;
  liveTranscript: string;
  start: () => Promise<StartResult>;
  stop: () => void;
  /** Cached permission state from the Permissions API ("granted" | "denied" | "prompt" | "unknown"). */
  permissionState: "granted" | "denied" | "prompt" | "unknown";
  /** Called by the panel when the AI's reply is final, so we can speak it and then re-open the mic. */
  speakAndResume: (text: string) => Promise<void>;
  /** Called by the panel when sending begins / ends, so the mic stays paused while the AI thinks. */
  setThinking: (thinking: boolean) => void;
}

/**
 * Hands-free voice conversation loop:
 *   listening → (silence ~1.2s) → onAutoSend(text) → setThinking(true)
 *   → speakAndResume(reply) → speaking → listening …
 */
export function useVoiceConversation(opts: VoiceConversationOptions): VoiceConversationApi {
  const { onAutoSend, silenceMs = 1200, lang = "en-IN" } = opts;

  const [active, setActive] = useState(false);
  const [state, setState] = useState<VoiceState>("idle");
  const [liveTranscript, setLiveTranscript] = useState("");
  const [permissionState, setPermissionState] = useState<
    "granted" | "denied" | "prompt" | "unknown"
  >("unknown");

  const recRef = useRef<SpeechRecInstance | null>(null);
  const finalChunksRef = useRef<string>("");
  const interimRef = useRef<string>("");
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUrlRef = useRef<string | null>(null);
  const wantListeningRef = useRef(false);
  const isStartingRef = useRef(false);
  const onAutoSendRef = useRef(onAutoSend);

  useEffect(() => {
    onAutoSendRef.current = onAutoSend;
  }, [onAutoSend]);

  const supported = !!getSpeechRec();

  // ---- Transcript merge helpers ----
  // Android Chrome (and some other builds) emit final results that overlap
  // with what we already have, e.g.:
  //   "creative" → "creative for" → "creative for this"
  //   "9585"     → "9585 896"     → "9585 896 733"
  // Naively appending these produces "creative creative for creative for this".
  // mergeTranscript merges by word-level overlap so the output is the longest
  // coherent phrase rather than a duplicated concatenation.
  const tokenize = (s: string): string[] =>
    s
      .toLowerCase()
      .replace(/[.,!?;:"']/g, " ")
      .split(/\s+/)
      .filter(Boolean);

  const mergeTranscript = (existing: string, incoming: string): string => {
    const incTrim = incoming.trim();
    if (!incTrim) return existing;
    const exTrim = existing.trim();
    if (!exTrim) return incTrim;

    const exTokens = tokenize(exTrim);
    const incTokens = tokenize(incTrim);
    if (incTokens.length === 0) return exTrim;

    // Case 1: incoming is fully contained at the end of existing → drop it.
    if (exTokens.length >= incTokens.length) {
      const tail = exTokens.slice(exTokens.length - incTokens.length);
      if (tail.join(" ") === incTokens.join(" ")) return exTrim;
    }

    // Case 2: existing is a prefix of incoming → replace with incoming.
    if (incTokens.length >= exTokens.length) {
      const head = incTokens.slice(0, exTokens.length);
      if (head.join(" ") === exTokens.join(" ")) return incTrim;
    }

    // Case 3: find the largest suffix of existing that matches a prefix of incoming.
    const maxOverlap = Math.min(exTokens.length, incTokens.length);
    let overlap = 0;
    for (let k = maxOverlap; k > 0; k--) {
      const exTail = exTokens.slice(exTokens.length - k).join(" ");
      const incHead = incTokens.slice(0, k).join(" ");
      if (exTail === incHead) {
        overlap = k;
        break;
      }
    }
    if (overlap > 0) {
      // Append only the new portion of incoming (preserve original casing).
      const incomingWords = incTrim.split(/\s+/);
      const tail = incomingWords.slice(overlap).join(" ");
      return tail ? `${exTrim} ${tail}` : exTrim;
    }

    // No overlap → append normally.
    return `${exTrim} ${incTrim}`;
  };

  // Track Permissions API state so the UI can warn the user before they tap.
  useEffect(() => {
    let cancelled = false;
    const nav = navigator as Navigator & {
      permissions?: {
        query: (d: { name: PermissionName }) => Promise<PermissionStatus>;
      };
    };
    if (!nav.permissions?.query) return;
    (async () => {
      try {
        const status = await nav.permissions!.query({
          name: "microphone" as PermissionName,
        });
        if (cancelled) return;
        setPermissionState(status.state as typeof permissionState);
        status.onchange = () => {
          setPermissionState(status.state as typeof permissionState);
        };
      } catch {
        // Some browsers reject "microphone" — leave as "unknown".
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const clearSilenceTimer = () => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
  };

  const stopRecognizer = useCallback(() => {
    clearSilenceTimer();
    const rec = recRef.current;
    if (rec) {
      try { rec.onresult = null; rec.onend = null; rec.onerror = null; rec.stop(); } catch { /* noop */ }
    }
    recRef.current = null;
  }, []);

  const stopAudio = useCallback(() => {
    const a = audioRef.current;
    if (a) {
      try { a.pause(); a.src = ""; } catch { /* noop */ }
    }
    audioRef.current = null;
    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current);
      audioUrlRef.current = null;
    }
  }, []);

  const fireAutoSend = useCallback(() => {
    // Merge any leftover interim into the final transcript using the same
    // overlap logic so the auto-sent message is never duplicated.
    const merged = interimRef.current
      ? mergeTranscript(finalChunksRef.current, interimRef.current)
      : finalChunksRef.current.trim();
    const text = merged.trim();
    finalChunksRef.current = "";
    interimRef.current = "";
    setLiveTranscript("");
    if (!text) return;
    setState("thinking");
    // Pause the mic while the AI is thinking + speaking.
    stopRecognizer();
    onAutoSendRef.current(text);
  }, [stopRecognizer]);

  const startRecognizer = useCallback(() => {
    const Ctor = getSpeechRec();
    if (!Ctor) return;
    if (recRef.current || isStartingRef.current) return;
    isStartingRef.current = true;

    const rec = new Ctor();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = lang;

    rec.onstart = () => {
      isStartingRef.current = false;
      setState("listening");
    };
    // Per-instance tracker of the highest result index already consumed.
    // Some Chrome (Android) builds redeliver previously-final results on
    // later onresult events, which caused duplicated transcript words
    // (e.g. "creative creative for creative for this").
    let lastConsumedIdx = -1;
    // Track the last final phrase we merged so we can also dedupe identical
    // re-emissions that arrive at a NEW resultIndex (Android Chrome does this).
    let lastFinalPhrase = "";
    rec.onresult = (e) => {
      let interim = "";
      let appendedFinal = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const res = e.results[i];
        const txt = res?.[0]?.transcript ?? "";
        if (res?.isFinal) {
          if (i > lastConsumedIdx) {
            appendedFinal += txt + " ";
            lastConsumedIdx = i;
          }
        } else {
          interim += txt;
        }
      }
      if (appendedFinal) {
        const trimmedAdd = appendedFinal.trim();
        // Skip exact-duplicate re-emissions of the most recent final phrase.
        if (trimmedAdd && trimmedAdd !== lastFinalPhrase) {
          finalChunksRef.current = mergeTranscript(
            finalChunksRef.current,
            trimmedAdd,
          );
          lastFinalPhrase = trimmedAdd;
        }
      }
      // Reconcile interim with what we already finalized: if interim is a
      // suffix/echo of the final transcript, drop it so the live preview
      // doesn't show "9585 896 9585 896 733" while speaking.
      const finalSoFar = finalChunksRef.current.trim();
      const merged = interim ? mergeTranscript(finalSoFar, interim) : finalSoFar;
      interimRef.current = interim;
      setLiveTranscript(merged);

      // (re)start silence timer whenever new speech arrives
      clearSilenceTimer();
      silenceTimerRef.current = setTimeout(fireAutoSend, silenceMs);
    };
    rec.onerror = (ev) => {
      // "no-speech" / "aborted" are normal — don't kill the loop.
      if (ev?.error === "not-allowed" || ev?.error === "service-not-allowed") {
        wantListeningRef.current = false;
        setActive(false);
        setState("idle");
      }
    };
    rec.onend = () => {
      isStartingRef.current = false;
      // If the user is still in voice mode and we're not currently
      // thinking/speaking, restart automatically. Some browsers end the
      // recognizer after every utterance.
      if (wantListeningRef.current && state !== "thinking" && state !== "speaking") {
        // small delay avoids InvalidStateError on rapid restart
        setTimeout(() => {
          if (wantListeningRef.current) startRecognizer();
        }, 150);
      }
    };
    recRef.current = rec;
    try {
      rec.start();
    } catch {
      isStartingRef.current = false;
      // Already started — ignore
    }
  }, [fireAutoSend, lang, silenceMs, state]);

  const start = useCallback(async (): Promise<StartResult> => {
    if (!supported) {
      return { ok: false, reason: "unsupported" };
    }
    // Insecure context shortcut — getUserMedia would throw SecurityError anyway.
    if (
      typeof window !== "undefined" &&
      window.location.protocol !== "https:" &&
      window.location.hostname !== "localhost" &&
      window.location.hostname !== "127.0.0.1"
    ) {
      return { ok: false, reason: "insecure" };
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      return { ok: false, reason: "unsupported" };
    }
    // Ensure mic permission is granted up-front so we don't half-start.
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((t) => t.stop());
      setPermissionState("granted");
    } catch (err) {
      const e = err as DOMException & { message?: string };
      const inIframe =
        typeof window !== "undefined" && window.self !== window.top;
      let reason: MicDenyReason = "unknown";
      if (e?.name === "NotAllowedError" || e?.name === "PermissionDeniedError") {
        reason = inIframe ? "iframe-blocked" : "denied";
        setPermissionState("denied");
      } else if (
        e?.name === "NotFoundError" ||
        e?.name === "DevicesNotFoundError" ||
        e?.name === "OverconstrainedError"
      ) {
        reason = "no-device";
      } else if (e?.name === "SecurityError") {
        reason = "insecure";
      }
      return { ok: false, reason, message: e?.message };
    }
    finalChunksRef.current = "";
    interimRef.current = "";
    setLiveTranscript("");
    wantListeningRef.current = true;
    setActive(true);
    startRecognizer();
    return { ok: true };
  }, [startRecognizer, supported]);

  const stop = useCallback(() => {
    wantListeningRef.current = false;
    stopRecognizer();
    stopAudio();
    finalChunksRef.current = "";
    interimRef.current = "";
    setLiveTranscript("");
    setActive(false);
    setState("idle");
  }, [stopAudio, stopRecognizer]);

  const setThinking = useCallback((thinking: boolean) => {
    setState((s) => {
      if (thinking) return "thinking";
      // If we were thinking and the caller says we're done, fall back to idle.
      // speakAndResume will move us into "speaking" right after.
      return s === "thinking" ? "idle" : s;
    });
  }, []);

  const speakAndResume = useCallback(async (rawText: string) => {
    if (!wantListeningRef.current) return;
    const text = cleanForSpeech(rawText);
    if (!text) {
      // Nothing to speak — go straight back to listening.
      setState("idle");
      if (wantListeningRef.current) startRecognizer();
      return;
    }
    setState("speaking");
    try {
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/elevenlabs-tts`;
      const resp = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({ text }),
      });
      if (!resp.ok) throw new Error(`TTS ${resp.status}`);
      const blob = await resp.blob();
      stopAudio();
      const objectUrl = URL.createObjectURL(blob);
      audioUrlRef.current = objectUrl;
      const audio = new Audio(objectUrl);
      audioRef.current = audio;
      await new Promise<void>((resolve) => {
        audio.onended = () => resolve();
        audio.onerror = () => resolve();
        audio.play().catch(() => resolve());
      });
    } catch {
      // TTS failed — degrade gracefully and reopen the mic.
    } finally {
      stopAudio();
      if (wantListeningRef.current) {
        setState("idle");
        startRecognizer();
      } else {
        setState("idle");
      }
    }
  }, [startRecognizer, stopAudio]);

  // Cleanup on unmount.
  useEffect(() => {
    return () => {
      wantListeningRef.current = false;
      stopRecognizer();
      stopAudio();
    };
  }, [stopAudio, stopRecognizer]);

  // If the caller switches `lang` while we're already listening, restart the
  // recognizer so the new locale takes effect immediately. The recognizer's
  // `lang` is read at construction time, so a live update requires a restart.
  useEffect(() => {
    if (!wantListeningRef.current) return;
    // Only restart when we're actually in a listening state; if we're
    // currently thinking/speaking, the next auto-restart will pick up the
    // new language naturally.
    if (state !== "listening") return;
    stopRecognizer();
    setTimeout(() => {
      if (wantListeningRef.current) startRecognizer();
    }, 150);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang]);

  return {
    supported,
    active,
    state,
    liveTranscript,
    start,
    stop,
    permissionState,
    speakAndResume,
    setThinking,
  };
}

/** Strip markdown / URLs / system notes so TTS sounds natural. */
export function cleanForSpeech(input: string): string {
  if (!input) return "";
  let t = input;
  // Drop our internal system-confirmation notes.
  t = t.replace(/\[system\][^\n]*/gi, "");
  // Code fences & inline code.
  t = t.replace(/```[\s\S]*?```/g, " ");
  t = t.replace(/`([^`]+)`/g, "$1");
  // Markdown links → label only.
  t = t.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");
  // Headings, bold/italic markers, list bullets.
  t = t.replace(/^#{1,6}\s+/gm, "");
  t = t.replace(/[*_]{1,3}([^*_\n]+)[*_]{1,3}/g, "$1");
  t = t.replace(/^[\s]*[-*•]\s+/gm, "");
  // Bare URLs.
  t = t.replace(/https?:\/\/\S+/g, "link");
  // Collapse whitespace.
  t = t.replace(/\n{2,}/g, ". ").replace(/\s+/g, " ").trim();
  // Cap length so TTS stays snappy.
  if (t.length > 600) t = t.slice(0, 600).replace(/[,;:.!?]?\s+\S*$/, "") + ".";
  return t;
}