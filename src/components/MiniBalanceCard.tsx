import React from "react";
import { RefreshCw } from "lucide-react";

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
    try {
      setRefreshing(true);
      await onRefresh();
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <div className="relative overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950/80 p-4 shadow-xl">
      <div
        className="pointer-events-none absolute -top-16 -right-16 h-44 w-44 rounded-full blur-3xl"
        style={{ backgroundColor: `${accentHex}22` }}
      />
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-zinc-200">
          <div className="h-9 w-9 flex items-center justify-center rounded-xl bg-zinc-900 border border-zinc-800">
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
            className={`inline-flex items-center rounded-xl border border-zinc-800 bg-zinc-900 p-2 text-zinc-200 hover:bg-zinc-800 ${
              refreshing ? "animate-spin" : ""
            }`}
            aria-label="Atualizar"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="mt-3">
        <div className="text-2xl sm:text-3xl font-semibold tracking-tight text-zinc-50 tabular-nums">
          {loading ? (
            <div className="h-8 w-36 animate-pulse rounded-lg bg-zinc-800" />
          ) : (
            primary
          )}
        </div>
        {subtitle && <p className="mt-1 text-xs text-zinc-400">{subtitle}</p>}
      </div>
    </div>
  );
}
