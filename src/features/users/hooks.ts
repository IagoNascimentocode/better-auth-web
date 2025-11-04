import {  useQuery } from "@tanstack/react-query";
import { api } from "../../lib/http";

export interface BalanceResponse {
  balance: number;
  available?: number;
  incomeToday?: number;
  expenseToday?: number;
}

export function useBalance(userId?: string) {

  return useQuery<number>({
    queryKey: ["balance", userId],
    queryFn: async () => {
      const res = await api<number>(`/transactions/balance/${userId}`, {
        method: "GET",
        credentials: "include",
      });

    return res.balance;
    },
  });
}


// export function useBalance(userId: string) {
//   return useQuery<BalanceResponse>({
//     queryKey: ["balance", userId],
//     queryFn: () => getBalanceByUserId(userId),
//     enabled: !!userId,
//     staleTime: 60_000, // ajuste se quiser
//   });
// }
