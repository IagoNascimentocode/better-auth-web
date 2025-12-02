import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  apiCreateExpense,
  apiUpdateExpense,
  apiDeleteExpense,
} from "./api";
import type { ICreateExpensesPayload, IUpdateExpensesPayload } from "./types";

export function useCreateExpense(userId: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (payload: ICreateExpensesPayload) => apiCreateExpense(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["expenses", userId] });
      qc.invalidateQueries({ queryKey: ["balance", userId] });
    },
  });
}

export function useUpdateExpense(userId: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: IUpdateExpensesPayload }) =>
      apiUpdateExpense(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["expenses", userId] });
      qc.invalidateQueries({ queryKey: ["balance", userId] });
    },
  });
}

export function useDeleteExpense(userId: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => apiDeleteExpense(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["expenses", userId] });
      qc.invalidateQueries({ queryKey: ["balance", userId] });
    },
  });
}