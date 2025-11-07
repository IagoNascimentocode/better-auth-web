import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { ICreateTransactionPayload, TransactionEntity } from "./types";
import { createTransaction } from "./api";
import { qk } from "../../lib/queryKeys";

function toCents(n: number | string): number {
  const x = typeof n === "number" ? n : Number(n);
  return Math.round(x * 100);
}
function fromCents(cents: number): number {
  return cents / 100;
}

type Ctx = { prevBalance?: number };

export function useCreateTransaction(userId: string) {
  const qc = useQueryClient();

  return useMutation<TransactionEntity, unknown, ICreateTransactionPayload, Ctx>({
    mutationFn: async (payload) => {
      const created = await createTransaction(payload);
      return created as TransactionEntity;
    },
    onMutate: async (payload) => {
      await qc.cancelQueries({ queryKey: qk.balance(userId) });

      const prev = qc.getQueryData<number>(qk.balance(userId));

      const deltaCents = toCents(payload.amount) * (payload.type === "income" ? 1 : -1);

      qc.setQueryData<number>(qk.balance(userId), (old = 0) => {
        const oldCents = toCents(old);
        return fromCents(oldCents + deltaCents);
      });

      return { prevBalance: prev };
    },
    onError: (_err, _payload, ctx) => {
      if (ctx?.prevBalance !== undefined) {
        qc.setQueryData(qk.balance(userId), ctx.prevBalance);
      }
    },
    onSuccess: async () => {
      // garante consistência caso o backend recalcule
      await qc.invalidateQueries({ queryKey: qk.balance(userId) });
    },
  });
}
