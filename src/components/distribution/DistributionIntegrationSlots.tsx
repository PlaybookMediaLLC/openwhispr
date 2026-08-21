import { useEffect, useState } from "react";
import { Link2, Loader2, RefreshCw, Unlink } from "lucide-react";
import { distribution } from "../../config/distribution";
import {
  RowboatStatusSchema,
  type RowboatRendererMethod,
  type RowboatStatus,
} from "../../config/rowboat";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { SettingsPanel, SettingsPanelRow } from "../ui/SettingsSection";

const extensionApi = () => window.electronAPI?.distributionExtensions;

function RowboatIntegrationCard() {
  const [status, setStatus] = useState<RowboatStatus | null>(null);
  const [endpoint, setEndpoint] = useState("");
  const [token, setToken] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = async () => {
    const response = await extensionApi()?.invoke("rowboat-export", "getStatus");
    if (response) {
      const next = RowboatStatusSchema.parse(response);
      setStatus(next);
      if (next.endpoint) setEndpoint(next.endpoint);
    }
  };

  useEffect(() => {
    void refresh().catch((cause) => setError(cause?.message || String(cause)));
  }, []);

  const run = async (method: RowboatRendererMethod, payload?: unknown) => {
    setBusy(true);
    setError(null);
    try {
      const response = await extensionApi()?.invoke("rowboat-export", method, payload);
      if (response) setStatus(RowboatStatusSchema.parse(response));
      if (method === "configure") setToken("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/50 mb-2 pl-1">
        Relationship capture
      </div>
      <SettingsPanel>
        <SettingsPanelRow>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Link2 className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-foreground">Rowboat</p>
                <p className="text-xs text-muted-foreground/70 mt-0.5 leading-relaxed">
                  Send consented notes and transcripts to Rowboat as durable CaptureArtifacts.
                </p>
              </div>
              {status?.enabled && (
                <span className="text-[10px] font-medium text-success">Connected</span>
              )}
            </div>

            {!status?.enabled ? (
              <div className="space-y-2 pl-12">
                <Input
                  value={endpoint}
                  onChange={(event) => setEndpoint(event.target.value)}
                  placeholder="https://rowboat.example.com/api"
                  aria-label="Rowboat API endpoint"
                />
                <Input
                  type="password"
                  value={token}
                  onChange={(event) => setToken(event.target.value)}
                  placeholder="Rowboat capture token"
                  aria-label="Rowboat capture token"
                />
                <Button
                  size="sm"
                  disabled={busy || !endpoint.trim() || !token.trim()}
                  onClick={() => run("configure", { endpoint, token })}
                >
                  {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  Connect to Rowboat
                </Button>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-3 pl-12">
                <div className="text-xs text-muted-foreground min-w-0">
                  <p className="truncate">{status.endpoint}</p>
                  <p>
                    {status.pending} capture{status.pending === 1 ? "" : "s"} queued
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" disabled={busy} onClick={() => run("retry")}>
                    <RefreshCw className="h-3.5 w-3.5" /> Retry
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={busy}
                    onClick={() => run("disconnect")}
                  >
                    <Unlink className="h-3.5 w-3.5" /> Disconnect
                  </Button>
                </div>
              </div>
            )}
            {(error || status?.lastError) && (
              <p className="text-xs text-destructive pl-12">{error || status?.lastError}</p>
            )}
          </div>
        </SettingsPanelRow>
      </SettingsPanel>
    </div>
  );
}

export default function DistributionIntegrationSlots() {
  if (!distribution.extensions.includes("rowboat-export")) return null;
  return <RowboatIntegrationCard />;
}
