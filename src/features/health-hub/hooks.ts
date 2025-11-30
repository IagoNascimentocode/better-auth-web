// src/features/wealth-hub/useWealthOverview.ts
import React from "react";
import { api } from "../../lib/http";
import type {  DashboardSummary, OperationType, PositionsResponse, WealthOverview } from "./types";

export function useWealthOverview(
  userId: string,
  from: string,
  to: string,
  operationType?: OperationType
) {
  const [data, setData] = React.useState<WealthOverview | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!userId || !from || !to) return;

    let cancelled = false;
    setLoading(true);
    setError(null);

    async function fetchAll() {
      try {
        console.log("[WealthHub] Fetch iniciando", {
          userId,
          from,
          to,
          operationType,
        });

        const positionsUrl =
          `/investment-transactions/investment-transactions/positions-with-fx/${userId}`;
        const positionsPromise = api<PositionsResponse>(positionsUrl, {
          method: "GET",
        });

        // monta params SEM operationType por padrão
        const params = new URLSearchParams({
          userId,
          from, // yyyy-MM-dd
          to,   // yyyy-MM-dd
        });

        // só envia se tiver filtro
        if (operationType) {
          params.append("operationType", operationType);
        }

        const summaryUrl = `/dashboard/summary?${params.toString()}`;
        const summaryPromise = api<DashboardSummary>(summaryUrl, {
          method: "GET",
        });

        const [positionsRes, summaryRes] = await Promise.all([
          positionsPromise,
          summaryPromise,
        ]);

        if (cancelled) return;

        setData({
          positions: positionsRes.positions,
          rates: positionsRes.rates,
          period: summaryRes.period,
          expenses: summaryRes.expenses,
          installments: summaryRes.installments,
        });
        setLastUpdated(new Date().toISOString());
      } catch (err) {
        if (cancelled) return;
        const msg =
          err instanceof Error ? err.message : "Erro ao carregar Wealth Hub";
        console.error("[WealthHub] Erro fetchAll", err);
        setError(msg);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchAll();

    return () => {
      cancelled = true;
    };
  }, [userId, from, to, operationType]);


  return { data, loading, error, lastUpdated };
}
