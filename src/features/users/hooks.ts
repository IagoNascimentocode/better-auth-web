import { useQuery } from "@tanstack/react-query";
import { api } from "../../lib/http";
import { qk } from "../../lib/queryKeys";
import type { BalanceResponse } from "./types";

export function useBalance(userId: string, opts?: { enabled?: boolean }) {
  return useQuery<BalanceResponse>({
    queryKey: qk.balance(userId),
    enabled: opts?.enabled && !!userId,

    queryFn: async () => {
      const res = await api(`/transactions/balance/${userId}`, {
        method: "GET",
        credentials: "include",
      });

      return res as BalanceResponse;
    },

    placeholderData: (prev) => prev,
    staleTime: 15000,
    gcTime: 5 * 60_000,
  });
}