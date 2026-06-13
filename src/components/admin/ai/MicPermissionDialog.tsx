import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { ExternalLink, MicOff, RefreshCw } from "lucide-react";
import type { MicDenyReason } from "./useVoiceConversation";

const PUBLISHED_URL = "https://chirpeel.lovable.app";

function isAndroid() {
  if (typeof navigator === "undefined") return false;
  return /android/i.test(navigator.userAgent);
}

export interface MicPermissionDialogProps {
  open: boolean;
  reason: MicDenyReason | null;
  onClose: () => void;
  onRetry: () => void;
}

export function MicPermissionDialog({
  open,
  reason,
  onClose,
  onRetry,
}: MicPermissionDialogProps) {
  if (!reason) return null;

  const android = isAndroid();

  let title = "Microphone is blocked";
  let body = "We couldn't access the microphone for voice mode.";
  let steps: string[] = [];
  let primary: { label: string; action: () => void; icon?: React.ReactNode } = {
    label: "Try again",
    action: onRetry,
    icon: <RefreshCw className="h-4 w-4" />,
  };
  let secondary: { label: string; action: () => void } | null = {
    label: "Reload page",
    action: () => window.location.reload(),
  };

  switch (reason) {
    case "denied":
      title = "Microphone is blocked for this site";
      body =
        "Chrome remembered an earlier block, so it won't ask again. Re-allow the microphone once and voice mode will start.";
      steps = android
        ? [
            "Tap the lock or info icon next to the URL above.",
            "Tap Permissions, then Microphone.",
            "Choose Allow.",
            "Tap Reload page below.",
          ]
        : [
            "Click the lock icon to the left of the URL.",
            "Open Site settings, find Microphone.",
            "Set it to Allow.",
            "Click Reload page below.",
          ];
      break;
    case "iframe-blocked":
      title = "Open the published site to use voice";
      body =
        "Voice mode needs the microphone, which isn't allowed inside the editor preview. Open the live site to talk to the assistant.";
      primary = {
        label: "Open published site",
        action: () => window.open(PUBLISHED_URL, "_blank", "noopener"),
        icon: <ExternalLink className="h-4 w-4" />,
      };
      secondary = null;
      break;
    case "no-device":
      title = "No microphone found";
      body =
        "We couldn't find a microphone. Plug one in or check your audio input settings, then try again.";
      secondary = null;
      break;
    case "insecure":
      title = "Voice mode requires HTTPS";
      body =
        "Microphone access only works on secure (HTTPS) connections. Open the published site to use voice mode.";
      primary = {
        label: "Open published site",
        action: () => window.open(PUBLISHED_URL, "_blank", "noopener"),
        icon: <ExternalLink className="h-4 w-4" />,
      };
      secondary = null;
      break;
    case "unsupported":
      title = "Voice mode isn't supported in this browser";
      body =
        "Use Chrome or Edge on desktop, or Chrome on Android, to talk to the assistant.";
      primary = { label: "OK", action: onClose };
      secondary = null;
      break;
    case "dismissed":
      title = "Permission prompt dismissed";
      body =
        "You closed the microphone prompt. Tap Try again and choose Allow when Chrome asks.";
      break;
    default:
      title = "Couldn't start voice mode";
      body =
        "Something went wrong starting the microphone. Try again, or reload the page.";
      break;
  }

  return (
    <AlertDialog open={open} onOpenChange={(o) => !o && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
            <MicOff className="h-6 w-6" />
          </div>
          <AlertDialogTitle className="text-center">{title}</AlertDialogTitle>
          <AlertDialogDescription className="text-center">
            {body}
          </AlertDialogDescription>
        </AlertDialogHeader>

        {steps.length > 0 && (
          <ol className="mx-auto mt-2 max-w-sm list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
            {steps.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ol>
        )}

        <AlertDialogFooter className="mt-4 flex-col gap-2 sm:flex-row sm:justify-center">
          <AlertDialogCancel className="m-0">Close</AlertDialogCancel>
          {secondary && (
            <Button
              variant="outline"
              onClick={() => {
                secondary!.action();
              }}
            >
              {secondary.label}
            </Button>
          )}
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              primary.action();
            }}
            className="gap-2"
          >
            {primary.icon}
            {primary.label}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}