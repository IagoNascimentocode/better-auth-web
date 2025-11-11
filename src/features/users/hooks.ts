// src/features/users/hooks.ts
import { useQuery } from "@tanstack/react-query";
import { api } from "../../lib/http";
import { qk } from "../../lib/queryKeys";

type RawBalance = number | { balance: number | string } | string | null | undefined;

function normalizeBalance(raw: RawBalance): number {
  if (raw == null) return 0;
  if (typeof raw === "number") return raw;
  if (typeof raw === "string") return Number(raw);
  if (typeof raw === "object" && "balance" in raw) {
    const v = (raw as any).balance;
    return typeof v === "number" ? v : Number(v);
  }
  return Number(raw as any);
}

export function useBalance(userId: string, opts?: { enabled?: boolean }) {
  return useQuery({
    queryKey: qk.balance(userId),
    enabled: opts?.enabled,
    queryFn: async () => {
      const res = await api<RawBalance>(`/transactions/balance/${userId}`, {
        method: "GET",
        credentials: "include",
      });
      return res
    },
    // mantém o último valor enquanto revalida (sem flicker)
    placeholderData: (prev) => prev ?? 0,
    staleTime: 15_000, // 15s
    gcTime: 5 * 60_000,
  });
}

// import {  useQuery } from "@tanstack/react-query";
// import { api } from "../../lib/http";

// export interface BalanceResponse {
//   balance: number;
//   available?: number;
//   incomeToday?: number;
//   expenseToday?: number;
// }

// export function useBalance(userId?: string) {

//   return useQuery<number>({
//     queryKey: ["balance", userId],
//     queryFn: async () => {
//       const res = await api<number>(`/transactions/balance/${userId}`, {
//         method: "GET",
//         credentials: "include",
//       });

//     return res.balance;
//     },
//   });
// }


// export function useBalance(userId: string) {
//   return useQuery<BalanceResponse>({
//     queryKey: ["balance", userId],
//     queryFn: () => getBalanceByUserId(userId),
//     enabled: !!userId,
//     staleTime: 60_000, // ajuste se quiser
//   });
// }
