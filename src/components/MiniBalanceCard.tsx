import React from "react";
import { RefreshCw } from "lucide-react";
import Tilt from "./Tilt";

export type MiniBalanceCardProps = {
  icon: React.ReactNode;
  title: string;
  primary: string;
  subtitle?: string;
  accentHex?: string;
  loading?: boolean;
  onRefresh?: () => void | Promise<void>;
};

export default function MiniBalanceCard({
  icon,
  title,
  primary,
  subtitle,
  accentHex = "#3b82f6",
  loading,
  onRefresh,
}: MiniBalanceCardProps) {
  const [refreshing, setRefreshing] = React.useState(false);

  async function handleRefresh() {
    if (!onRefresh) return;
    try { setRefreshing(true); await onRefresh(); }
    finally { setRefreshing(false); }
  }

  return (
    <Tilt className="rounded-2xl" maxTilt={7}>
      <div
        className="
          relative overflow-hidden rounded-2xl border border-zinc-800
          bg-zinc-950/80 p-4 shadow-deep bg-noise
        "
        style={{
          boxShadow: `0 0 0 1px rgba(255,255,255,0.04),
                      0 12px 30px -8px rgba(0,0,0,0.55),
                      0 30px 60px -30px ${accentHex}33`,
        }}
      >
        {/* Glow suave no fundo que responde ao accent */}
        <div
          className="pointer-events-none absolute -top-20 -right-20 h-56 w-56 rounded-full blur-3xl"
          style={{ backgroundColor: `${accentHex}22` }}
        />
        <div
          className="pointer-events-none absolute -bottom-24 -left-24 h-64 w-64 rounded-full blur-[70px]"
          style={{ background: `radial-gradient(60% 60% at 50% 50%, ${accentHex}22, transparent)` }}
        />

        <div className="relative z-10 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-zinc-200">
            <div
              className="h-9 w-9 flex items-center justify-center rounded-xl border"
              style={{
                background: "linear-gradient(180deg, rgba(24,24,27,1) 0%, rgba(9,9,11,1) 100%)",
                borderColor: "rgba(63,63,70,.6)",
                boxShadow: `inset 0 1px 0 rgba(255,255,255,.04), 0 8px 20px -10px ${accentHex}55`,
              }}
            >
              {icon}
            </div>
            <div className="leading-tight">
              <p className="text-xs uppercase tracking-wide text-zinc-400">{title}</p>
            </div>
          </div>
          {onRefresh && (
            <button
              type="button"
              onClick={handleRefresh}
              className="inline-flex items-center rounded-xl border border-zinc-800 bg-zinc-900 p-2 text-zinc-200 hover:bg-zinc-800"
              style={{ boxShadow: `0 6px 18px -10px ${accentHex}aa` }}
              aria-label="Atualizar"
              title="Atualizar"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            </button>
          )}
        </div>

        <div className="relative z-10 mt-3">
          <div
            className="text-2xl sm:text-3xl font-semibold tracking-tight text-zinc-50 tabular-nums"
            style={{ textShadow: `0 1px 0 rgba(0,0,0,.25)` }}
          >
            {loading ? (
              <div className="h-8 w-36 animate-pulse rounded-lg bg-zinc-800" />
            ) : (
              primary
            )}
          </div>
          {subtitle && <p className="mt-1 text-xs text-zinc-400">{subtitle}</p>}
        </div>
      </div>
    </Tilt>
  );
}
