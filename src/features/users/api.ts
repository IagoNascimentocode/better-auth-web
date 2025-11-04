import { api } from "../../lib/http";

export interface BalanceResponse {
  balance: number;
  available?: number;
  incomeToday?: number;
  expenseToday?: number;
}

export async function getBalanceByUserId(userId: string): Promise<BalanceResponse> {
  return await api<BalanceResponse>(`/transactions/balance/${userId}`, { method: "GET" });
}
