import { useEffect, useState, type ReactNode } from "react";

/**
 * Gates the app on Power Apps SDK initialization.
 * - Mock mode (VITE_USE_DATAVERSE != "true"): renders immediately.
 * - Dataverse mode: awaits `initialize()` from the Power Apps client library,
 *   which wires the authenticated session used by every generated service call.
 *
 * The official Vite template ships an equivalent PowerProvider; if you scaffolded
 * from `microsoft/PowerAppsCodeApps/templates/vite`, prefer that one and delete this.
 */
export function PowerProvider({ children }: { children: ReactNode }) {
  const useDataverse = import.meta.env.VITE_USE_DATAVERSE === "true";
  const [ready, setReady] = useState(!useDataverse);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!useDataverse) return;
    let cancelled = false;
    (async () => {
      try {
        // getContext() resolves once the Power Apps host has established the
        // authenticated app/user/session context used by connector calls.
        const { getContext } = await import("@microsoft/power-apps/app");
        await getContext();
        if (!cancelled) setReady(true);
      } catch (e) {
        if (!cancelled) setError(String(e));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [useDataverse]);

  if (error) {
    return (
      <div className="boot">
        <b>Power Apps initialization failed.</b>
        <p>Ensure the app runs via <code>power-apps run</code> and you are signed into the right tenant.</p>
        <small>{error}</small>
      </div>
    );
  }
  if (!ready) return <div className="boot">Loading…</div>;
  return <>{children}</>;
}
