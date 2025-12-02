import { useQuery } from "@tanstack/react-query";
import { apiListExpenses } from "./api";
import type { ExpenseEntity } from "./types";

export function useExpenses(userId: string, options: any = {}) {
  return useQuery<ExpenseEntity[]>({
    queryKey: ["expenses", userId],
    queryFn: () => apiListExpenses(userId),
    enabled: !!userId,
    ...options,
  });
}

