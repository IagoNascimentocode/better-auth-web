// src/features/transactions/api.ts

import { api } from "../../lib/http";
import type { ICreateTransactionPayload, TransactionEntity } from "./types";

export async function createTransaction(
  payload: ICreateTransactionPayload
): Promise<TransactionEntity> {
  const data = await api<TransactionEntity[]>("/transactions/create", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return Array.isArray(data) ? data[0] : (data as unknown as TransactionEntity);
}

export async function updateTransaction(
  id: string,
  changes: Partial<Pick<TransactionEntity, "title"|"amount"|"type"|"date"|"notes"|"categoryId">>
): Promise<TransactionEntity> {
  return api<TransactionEntity>(`/transactions/update/${id}`, {
    method: "PATCH",
    body: JSON.stringify(changes),
  });
}

export async function listTransactions(userId: string): Promise<TransactionEntity[]> {
  return api<TransactionEntity[]>(`/transactions/list/${userId}`, { method: "GET" });
}
