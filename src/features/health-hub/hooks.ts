
import React from "react";
import { api } from "../../lib/http";
import type {
  DashboardSummary,
  OperationType,
  PositionsResponse,
  WealthOverview,
} from "./types";

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

  const fetchAll = React.useCallback(async () => {
    if (!userId || !from || !to) return;

    setLoading(true);
    setError(null);

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

      const params = new URLSearchParams({
        userId,
        from, // yyyy-MM-dd
        to,   // yyyy-MM-dd
      });

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

      setData({
        positions: positionsRes.positions,
        rates: positionsRes.rates,
        period: summaryRes.period,
        expenses: summaryRes.expenses,
        installments: summaryRes.installments,
      });
      setLastUpdated(new Date().toISOString());
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Erro ao carregar Wealth Hub";
      console.error("[WealthHub] Erro fetchAll", err);
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [userId, from, to, operationType]);

  React.useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  return {
    data,
    loading,
    error,
    lastUpdated,
    refetch: fetchAll,
  };
}
