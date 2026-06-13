import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { TURNSTILE_SCRIPT_SRC, TURNSTILE_SITE_KEY } from "@/lib/turnstile";
import { Loader2, ShieldCheck } from "lucide-react";

type TurnstileTheme = "light" | "dark" | "auto";

export interface TurnstileWidgetHandle {
  reset: () => void;
}

interface TurnstileWidgetProps {
  onVerify: (token: string) => void;
  onExpire?: () => void;
  onError?: () => void;
  theme?: TurnstileTheme;
  className?: string;
}

declare global {
  interface Window {
    turnstile?: {
      render: (
        el: HTMLElement,
        opts: {
          sitekey: string;
          callback?: (token: string) => void;
          "expired-callback"?: () => void;
          "error-callback"?: () => void;
          theme?: TurnstileTheme;
          appearance?: "always" | "execute" | "interaction-only";
        }
      ) => string;
      reset: (widgetId?: string) => void;
      remove: (widgetId?: string) => void;
    };
  }
}

let scriptPromise: Promise<void> | null = null;

function loadTurnstileScript(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.turnstile) return Promise.resolve();
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src^="https://challenges.cloudflare.com/turnstile/v0/api.js"]`
    );
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("turnstile load failed")));
      if (window.turnstile) resolve();
      return;
    }
    const s = document.createElement("script");
    s.src = TURNSTILE_SCRIPT_SRC;
    s.async = true;
    s.defer = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("turnstile load failed"));
    document.head.appendChild(s);
  });
  return scriptPromise;
}

export const TurnstileWidget = forwardRef<TurnstileWidgetHandle, TurnstileWidgetProps>(
  ({ onVerify, onExpire, onError, theme = "auto", className }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const widgetIdRef = useRef<string | null>(null);
    const [status, setStatus] = useState<"loading" | "ready" | "verified" | "error">("loading");

    useImperativeHandle(ref, () => ({
      reset: () => {
        if (window.turnstile && widgetIdRef.current) {
          window.turnstile.reset(widgetIdRef.current);
          setStatus("ready");
        }
      },
    }));

    useEffect(() => {
      let cancelled = false;
      loadTurnstileScript()
        .then(() => {
          if (cancelled || !containerRef.current || !window.turnstile) return;
          widgetIdRef.current = window.turnstile.render(containerRef.current, {
            sitekey: TURNSTILE_SITE_KEY,
            theme,
            callback: (token: string) => {
              setStatus("verified");
              onVerify(token);
            },
            "expired-callback": () => {
              setStatus("ready");
              onExpire?.();
            },
            "error-callback": () => {
              setStatus("error");
              onError?.();
            },
          });
          setStatus("ready");
        })
        .catch(() => {
          if (!cancelled) setStatus("error");
        });
      return () => {
        cancelled = true;
        if (window.turnstile && widgetIdRef.current) {
          try {
            window.turnstile.remove(widgetIdRef.current);
          } catch {
            /* noop */
          }
        }
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
      <div className={className}>
        <div ref={containerRef} className="flex justify-center min-h-[70px]" />
        <p className="text-[11px] text-muted-foreground text-center mt-1 flex items-center justify-center gap-1.5">
          {status === "loading" && (
            <>
              <Loader2 className="w-3 h-3 animate-spin" /> Loading verification…
            </>
          )}
          {status === "ready" && (
            <>
              <Loader2 className="w-3 h-3 animate-spin" /> Verifying you're human…
            </>
          )}
          {status === "verified" && (
            <>
              <ShieldCheck className="w-3 h-3 text-emerald-500" /> Verified
            </>
          )}
          {status === "error" && (
            <span className="text-destructive">Verification unavailable. Refresh the page.</span>
          )}
        </p>
      </div>
    );
  }
);

TurnstileWidget.displayName = "TurnstileWidget";