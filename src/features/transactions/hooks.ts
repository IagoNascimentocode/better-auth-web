// src/features/transactions/hooks.ts
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createTransaction, listTransactions, updateTransaction } from "./api";
import type { ICreateTransactionPayload, TransactionEntity } from "./types";

export function useTransactions(userId: string) {
  return useQuery({
    queryKey: ["transactions", userId],
    queryFn: () => listTransactions(userId),
  });
}

export function useCreateTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: ICreateTransactionPayload) => createTransaction(payload),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ["transactions", variables.userId] });
    },
  });
}

export function useUpdateTransaction(userId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, changes }: { id: string; changes: Partial<TransactionEntity> }) =>
      updateTransaction(id, changes),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["transactions", userId] });
    },
  });
}
