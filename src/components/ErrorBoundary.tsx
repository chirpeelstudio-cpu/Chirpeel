import { Component, type ReactNode, type ErrorInfo } from "react";
import { AlertTriangle, RotateCw, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
  /** Optional friendly label shown in the fallback UI (e.g. "Pipeline"). */
  scope?: string;
}

interface State {
  error: Error | null;
  info: ErrorInfo | null;
}

/**
 * Catches render-time errors so a single broken component does not crash
 * the whole studio. Logs to console (Lovable Cloud captures these) and
 * lets the user retry or copy diagnostic text for support.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null, info: null };

  static getDerivedStateFromError(error: Error): State {
    return { error, info: null };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    this.setState({ info });
    // eslint-disable-next-line no-console
    console.error("[ErrorBoundary]", this.props.scope ?? "root", error, info);
    // Best-effort: forward to a custom global hook that pages can wire up.
    try {
      window.dispatchEvent(new CustomEvent("chirpeel:error", {
        detail: {
          scope: this.props.scope,
          message: error.message,
          stack: error.stack,
          componentStack: info.componentStack,
          url: window.location.href,
        },
      }));
    } catch { /* ignore */ }
  }

  reset = () => this.setState({ error: null, info: null });

  copy = async () => {
    const { error, info } = this.state;
    const text = [
      `Scope: ${this.props.scope ?? "root"}`,
      `URL: ${window.location.href}`,
      `Time: ${new Date().toISOString()}`,
      `User-Agent: ${navigator.userAgent}`,
      "",
      `Error: ${error?.message ?? "(none)"}`,
      "",
      "Stack:",
      error?.stack ?? "(none)",
      "",
      "Component stack:",
      info?.componentStack ?? "(none)",
    ].join("\n");
    try { await navigator.clipboard.writeText(text); } catch { /* ignore */ }
  };

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="min-h-[40vh] w-full flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-card border border-destructive/30 rounded-xl p-6 space-y-4 shadow-lg">
          <div className="flex items-start gap-3">
            <span className="w-10 h-10 rounded-lg bg-destructive/10 text-destructive flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </span>
            <div className="min-w-0">
              <h2 className="font-display font-semibold text-lg">Something went wrong</h2>
              <p className="text-sm text-muted-foreground mt-1">
                {this.props.scope ? <>The <span className="font-medium text-foreground">{this.props.scope}</span> screen </> : "This screen "}
                hit an unexpected error. Your data is safe — try reloading or jump to a different section.
              </p>
            </div>
          </div>

          <pre className="text-xs bg-muted/50 rounded-lg p-3 overflow-auto max-h-40 font-mono text-muted-foreground">
            {this.state.error.message}
          </pre>

          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={this.reset}>
              <RotateCw className="w-4 h-4 mr-1.5" /> Try again
            </Button>
            <Button size="sm" variant="outline" onClick={() => window.location.reload()}>
              Reload page
            </Button>
            <Button size="sm" variant="ghost" onClick={this.copy}>
              <Copy className="w-4 h-4 mr-1.5" /> Copy details
            </Button>
          </div>
        </div>
      </div>
    );
  }
}
