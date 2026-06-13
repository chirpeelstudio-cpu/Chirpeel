/**
 * Source-of-truth list for voice-input languages exposed to the user in the
 * AI Assistant panel. The `code` is a BCP-47 tag passed straight to the
 * Web Speech API's `SpeechRecognition.lang`.
 *
 * Add a new language by appending one row here — no other code changes needed.
 */
export type VoiceLanguage = {
  code: string;
  /** Full label shown in the dropdown. */
  label: string;
  /** Compact label shown on the trigger (especially on mobile). */
  short: string;
};

export const VOICE_LANGUAGES: VoiceLanguage[] = [
  { code: "en-IN", label: "English (India)", short: "EN" },
  { code: "en-US", label: "English (US)", short: "EN-US" },
  { code: "en-GB", label: "English (UK)", short: "EN-UK" },
  { code: "hi-IN", label: "हिन्दी (Hindi)", short: "हिं" },
  { code: "ta-IN", label: "தமிழ் (Tamil)", short: "தமி" },
  { code: "te-IN", label: "తెలుగు (Telugu)", short: "తె" },
  { code: "ml-IN", label: "മലയാളം (Malayalam)", short: "മല" },
  { code: "kn-IN", label: "ಕನ್ನಡ (Kannada)", short: "ಕನ್" },
  { code: "mr-IN", label: "मराठी (Marathi)", short: "मरा" },
  { code: "bn-IN", label: "বাংলা (Bengali)", short: "বাং" },
  { code: "gu-IN", label: "ગુજરાતી (Gujarati)", short: "ગુજ" },
  { code: "pa-IN", label: "ਪੰਜਾਬੀ (Punjabi)", short: "ਪੰਜ" },
  { code: "ur-IN", label: "اردو (Urdu)", short: "اردو" },
  { code: "es-ES", label: "Español (Spain)", short: "ES" },
  { code: "fr-FR", label: "Français", short: "FR" },
  { code: "de-DE", label: "Deutsch", short: "DE" },
  { code: "ar-SA", label: "العربية", short: "ع" },
  { code: "zh-CN", label: "中文 (普通话)", short: "中" },
  { code: "ja-JP", label: "日本語", short: "日" },
];

export const DEFAULT_VOICE_LANG = "en-IN";
const STORAGE_KEY = "ai.voice.lang";

function isValid(code: string | null): boolean {
  return !!code && VOICE_LANGUAGES.some((l) => l.code === code);
}

export function loadVoiceLang(): string {
  if (typeof window === "undefined") return DEFAULT_VOICE_LANG;
  try {
    const v = window.localStorage.getItem(STORAGE_KEY);
    return isValid(v) ? (v as string) : DEFAULT_VOICE_LANG;
  } catch {
    return DEFAULT_VOICE_LANG;
  }
}

export function saveVoiceLang(code: string): void {
  if (typeof window === "undefined") return;
  if (!isValid(code)) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, code);
  } catch {
    /* quota / privacy mode — ignore */
  }
}

export function getVoiceLanguageLabel(code: string): string {
  return VOICE_LANGUAGES.find((l) => l.code === code)?.label ?? code;
}

export function getVoiceLanguageShort(code: string): string {
  return VOICE_LANGUAGES.find((l) => l.code === code)?.short ?? code;
}