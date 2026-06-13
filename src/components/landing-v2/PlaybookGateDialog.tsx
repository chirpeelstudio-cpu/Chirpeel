import { useEffect, useRef, useState } from "react";
import { Loader2, CheckCircle2, Mail, Phone, User as UserIcon, Download } from "lucide-react";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { PLAYBOOKS } from "./data";

const STORAGE_KEY = "chirpeel_playbook_verified";
const VERIFY_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

const detailsSchema = z.object({
  name: z.string().trim().min(2, "Enter your full name").max(100),
  email: z.string().trim().toLowerCase().email("Enter a valid email").max(255),
  mobile: z
    .string()
    .trim()
    .regex(/^[6-9]\d{9}$/, "Enter a 10-digit Indian mobile number"),
});

type Step = "details" | "otp" | "done";

export type PlaybookGateState = {
  verifiedAt: number;
  email: string;
};

export function getStoredVerification(): PlaybookGateState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PlaybookGateState;
    if (!parsed?.verifiedAt) return null;
    if (Date.now() - parsed.verifiedAt > VERIFY_TTL_MS) return null;
    return parsed;
  } catch {
    return null;
  }
}

function downloadFile(url: string) {
  const a = document.createElement("a");
  a.href = url;
  a.download = "";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** File URL to auto-download once verified */
  pendingFile?: string | null;
  /** Title of the playbook the user clicked (for CTA copy). If null, treat as "all playbooks". */
  pendingTitle?: string | null;
  onVerified?: () => void;
}

export default function PlaybookGateDialog({ open, onOpenChange, pendingFile, pendingTitle, onVerified }: Props) {
  const [step, setStep] = useState<Step>("details");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");
  const [otp, setOtp] = useState("");
  const [verificationId, setVerificationId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resendIn, setResendIn] = useState(0);
  const triggeredDownload = useRef(false);

  // Reset on close
  useEffect(() => {
    if (!open) {
      setTimeout(() => {
        setStep("details");
        setOtp("");
        setVerificationId(null);
        setLoading(false);
        setResendIn(0);
        triggeredDownload.current = false;
      }, 200);
    }
  }, [open]);

  // Resend timer
  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendIn]);

  const sendCta = pendingTitle ? `Download ${pendingTitle}` : "Unlock all 4 playbooks";
  const verifyCta = pendingTitle ? `Verify & download ${pendingTitle}` : "Verify & unlock all";

  const sendOtp = async () => {
    const parsed = detailsSchema.safeParse({ name, email, mobile });
    if (!parsed.success) {
      toast.error(parsed.error.errors[0]?.message ?? "Check your details");
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("playbook-send-otp", {
        body: parsed.data,
      });
      if (error) throw error;
      if (!data?.verification_id) throw new Error("Could not start verification");
      setVerificationId(data.verification_id);
      setStep("otp");
      setResendIn(60);
      if (data.email_sent === false) {
        toast.message("OTP generated", {
          description: "Email delivery is still being set up — ask the studio for your code.",
        });
      } else {
        toast.success("OTP sent to your email");
      }
    } catch (e: any) {
      toast.error(e?.message ?? "Couldn't send OTP. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async () => {
    if (!verificationId || otp.length !== 6) {
      toast.error("Enter the 6-digit code");
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("playbook-verify-otp", {
        body: { verification_id: verificationId, otp },
      });
      if (error) throw error;
      if (!data?.ok) throw new Error(data?.error ?? "Verification failed");

      const state: PlaybookGateState = { verifiedAt: Date.now(), email };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));

      setStep("done");
      toast.success("Verified — your downloads are unlocked");
      onVerified?.();

      if (pendingFile && !triggeredDownload.current) {
        triggeredDownload.current = true;
        setTimeout(() => downloadFile(pendingFile), 400);
      }
    } catch (e: any) {
      toast.error(e?.message ?? "Invalid OTP");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        {step === "details" && (
          <>
            <DialogHeader>
              <DialogTitle className="font-display text-2xl">Unlock the playbooks</DialogTitle>
              <DialogDescription>
                Tell us where to send your verification code. Free, no spam.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 mt-2">
              <div className="relative">
                <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Full name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="pl-9"
                  autoComplete="name"
                />
              </div>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="email"
                  placeholder="Email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-9"
                  autoComplete="email"
                />
              </div>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <span className="absolute left-9 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  +91
                </span>
                <Input
                  type="tel"
                  inputMode="numeric"
                  placeholder="10-digit mobile"
                  value={mobile}
                  maxLength={10}
                  onChange={(e) => setMobile(e.target.value.replace(/\D/g, "").slice(0, 10))}
                  className="pl-16"
                  autoComplete="tel"
                />
              </div>
            </div>
            <button
              onClick={sendOtp}
              disabled={loading}
              className="mt-4 w-full bg-foreground text-background py-3 rounded-full text-sm font-semibold hover:opacity-90 disabled:opacity-60 inline-flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Sending code…
                </>
              ) : (
                sendCta
              )}
            </button>
            <p className="text-[11px] text-muted-foreground text-center mt-2">
              We'll send a 6-digit code to your email to verify it's really you.
            </p>
          </>
        )}

        {step === "otp" && (
          <>
            <DialogHeader>
              <DialogTitle className="font-display text-2xl">Enter your code</DialogTitle>
              <DialogDescription>
                We sent a 6-digit code to <span className="font-medium text-foreground">{email}</span>
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-center mt-4">
              <InputOTP maxLength={6} value={otp} onChange={setOtp}>
                <InputOTPGroup>
                  {[0, 1, 2, 3, 4, 5].map((i) => (
                    <InputOTPSlot key={i} index={i} />
                  ))}
                </InputOTPGroup>
              </InputOTP>
            </div>
            <button
              onClick={verifyOtp}
              disabled={loading || otp.length !== 6}
              className="mt-5 w-full bg-foreground text-background py-3 rounded-full text-sm font-semibold hover:opacity-90 disabled:opacity-60 inline-flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Verifying…
                </>
              ) : (
                verifyCta
              )}
            </button>
            <div className="flex items-center justify-between mt-3 text-xs">
              <button
                onClick={() => setStep("details")}
                className="text-muted-foreground hover:text-foreground"
              >
                ← Change details
              </button>
              <button
                disabled={resendIn > 0 || loading}
                onClick={sendOtp}
                className="text-primary font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {resendIn > 0 ? `Resend in ${resendIn}s` : "Resend code"}
              </button>
            </div>
          </>
        )}

        {step === "done" && (
          <>
            <DialogHeader>
              <DialogTitle className="font-display text-2xl flex items-center gap-2">
                <CheckCircle2 className="w-6 h-6 text-primary" /> You're verified!
              </DialogTitle>
              <DialogDescription>
                All four playbooks are unlocked. Your first download started automatically.
              </DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-1 gap-2 mt-3">
              {PLAYBOOKS.map((p) => (
                <a
                  key={p.title}
                  href={p.file}
                  download
                  className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-3 hover:border-primary/40 hover:bg-accent/30 transition"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate">{p.title}</p>
                    <p className="text-[11px] text-muted-foreground truncate">{p.tag}</p>
                  </div>
                  <Download className="w-4 h-4 text-primary shrink-0" />
                </a>
              ))}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}