import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { clearAuthGuardCache, ensureAuthed, type GuardResult } from "@/lib/auth-guard";

/**
 * React hook around `ensureAuthed`. Components can use this to gate fetches:
 *
 *   const { ready, userId } = useAuthGuard({ requireAdmin: true });
 *   useEffect(() => { if (ready) loadData(); }, [ready]);
 */
export function useAuthGuard(opts: { requireAdmin?: boolean } = {}) {
  const [state, setState] = useState<{ loading: boolean; result: GuardResult | null }>({
    loading: true,
    result: null,
  });

  const check = useCallback(async () => {
    setState((s) => ({ ...s, loading: true }));
    const result = await ensureAuthed(opts);
    setState({ loading: false, result });
  }, [opts.requireAdmin]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    check();
    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      clearAuthGuardCache();
      check();
    });
    return () => sub.subscription.unsubscribe();
  }, [check]);

  return {
    loading: state.loading,
    ready: state.result?.ok === true,
    userId: state.result?.ok ? state.result.userId : null,
    reason: state.result && state.result.ok === false ? state.result.reason : null,
    refresh: check,
  };
}