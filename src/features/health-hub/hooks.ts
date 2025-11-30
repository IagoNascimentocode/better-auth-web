// src/features/wealth-hub/useWealthOverview.ts
import React from "react";
import { api } from "../../lib/http";
import type { DashboardSummary, OperationType, PositionsResponse, WealthOverview } from "./types";

export function useWealthOverview(
  userId: string,
  from: string,
  to: string,
  operationType: OperationType
) {
  const [data, setData] = React.useState<WealthOverview | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!userId || !from || !to || !operationType) return;

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

        // 1) posições + fx
        const positionsUrl =
          `/investment-transactions/investment-transactions/positions-with-fx/${userId}`;
        console.log("[WealthHub] GET", positionsUrl);
        const positionsPromise = api<PositionsResponse>(positionsUrl, {
          method: "GET",
        });

        // 2) resumo do dashboard com range de datas + operationType
        const params = new URLSearchParams({
          userId,
          from, // yyyy-MM-dd
          to,   // yyyy-MM-dd
          operationType,
        });
        const summaryUrl = `/dashboard/summary?${params.toString()}`;
        console.log("[WealthHub] GET", summaryUrl);

        const summaryPromise = api<DashboardSummary>(summaryUrl, {
          method: "GET",
        });

        const [positionsRes, summaryRes] = await Promise.all([
          positionsPromise,
          summaryPromise,
        ]);

        console.log("[WealthHub] Responses", {
          positionsRes,
          summaryRes,
        });

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
