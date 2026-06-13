import { Loader2 } from "lucide-react";

interface AuthLoadingOverlayProps {
  message?: string;
}

/**
 * Global auth loading overlay shown while ProtectedRoute resolves the session
 * and (optionally) the user's role. Keeps the experience consistent across
 * every protected page so we never flash content or shift layout.
 */
export default function AuthLoadingOverlay({ message = "Checking your session…" }: AuthLoadingOverlayProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
    >
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-card/80 px-6 py-5 shadow-lg">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">{message}</p>
      </div>
    </div>
  );
}