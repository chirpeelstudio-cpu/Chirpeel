// Lazy-load the Razorpay Checkout script and open a subscription checkout.

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void };
  }
}

const SCRIPT_URL = "https://checkout.razorpay.com/v1/checkout.js";
let scriptPromise: Promise<void> | null = null;

export function loadRazorpay(): Promise<void> {
  if (typeof window === "undefined") return Promise.reject(new Error("No window"));
  if (window.Razorpay) return Promise.resolve();
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = SCRIPT_URL;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => {
      scriptPromise = null;
      reject(new Error("Failed to load Razorpay checkout"));
    };
    document.body.appendChild(s);
  });
  return scriptPromise;
}

export interface OpenSubscriptionOpts {
  key: string;
  subscription_id: string;
  name: string;
  description?: string;
  prefill?: { name?: string; email?: string; contact?: string };
  theme?: { color?: string };
  onSuccess: (resp: { razorpay_payment_id: string; razorpay_subscription_id: string; razorpay_signature: string }) => void;
  onDismiss?: () => void;
}

export async function openRazorpaySubscription(opts: OpenSubscriptionOpts): Promise<void> {
  await loadRazorpay();
  if (!window.Razorpay) throw new Error("Razorpay not available");
  const rzp = new window.Razorpay({
    key: opts.key,
    subscription_id: opts.subscription_id,
    name: opts.name,
    description: opts.description,
    prefill: opts.prefill,
    theme: opts.theme ?? { color: "#1d4ed8" },
    handler: opts.onSuccess,
    modal: { ondismiss: opts.onDismiss },
  });
  rzp.open();
}