// src/pages/DashboardPage.tsx
import React from "react";
import type {
  ICreateTransactionPayload,
  TransactionEntity,
} from "../features/transactions/types";
import { createTransaction } from "../features/transactions/api";
import BankBalanceCard from "../components/BankBalanceCard";
import { useSession } from "../lib/useSession";
import { useBalance } from "../features/users/hooks";
import { useMutation, useQueryClient } from "@tanstack/react-query";

// Util: garante que qualquer formato do backend viabilize Number(...)
function toNumberBalance(input: unknown): number {
  if (input == null) return 0;
  if (typeof input === "number") return input;
  if (typeof input === "string") return Number(input);
  if (typeof input === "object" && input && "balance" in (input as any)) {
    const v = (input as any).balance;
    return typeof v === "number" ? v : Number(v);
  }
  return Number(input as any);
}

export default function DashboardPage() {
  // 1) Sessão
  const { data: session, isLoading: loadingSession } = useSession();
  const userId = session?.user?.id;

  // 2) Saldo do backend via React Query
  //    IMPORTANTE: habilitar apenas quando tiver userId
  const {
    data: serverBalanceRaw,
    isLoading: loadingBalance,
    refetch: refetchBalance,
  } = useBalance(userId ?? "", { enabled: !!userId });

  // Estado local (mostra enquanto carrega e para métricas do dia)
  const [balance, setBalance] = React.useState<number>(0);
  const [available, setAvailable] = React.useState<number>(12000);
  const [incomeToday, setIncomeToday] = React.useState<number>(349.9);
  const [expenseToday, setExpenseToday] = React.useState<number>(120.0);
  const [loading, setLoading] = React.useState<boolean>(false);

  // Sincroniza o local balance sempre que chegar algo do servidor
  React.useEffect(() => {
    const parsed = toNumberBalance(serverBalanceRaw);
    if (!Number.isNaN(parsed)) {
      setBalance(parsed);
    }
  }, [serverBalanceRaw]);

  const defaultCategoryId = "2db3bf90-d8e9-45de-b1d1-8e8ab9c749dd";

  const qc = useQueryClient();

  // 3) Criação de transação com update otimista + revalidação
  const createTxMutation = useMutation({
    mutationFn: async (payload: ICreateTransactionPayload) => {
      const created = await createTransaction(payload);
      return created as TransactionEntity;
    },
    onMutate: async (payload) => {
      // cancela requests pendentes para não sobrescrever o otimista
      await qc.cancelQueries({ queryKey: ["balance", userId] });

      // captura snapshot anterior
      const prev = qc.getQueryData(["balance", userId]);
      const prevNum = toNumberBalance(prev);

      const delta =
        Number(payload.amount) * (payload.type === "income" ? 1 : -1);

      // seta no cache o valor otimista do saldo
      qc.setQueryData(["balance", userId], prevNum + delta);

      // reflete imediatamente no estado local (UI responsiva)
      setBalance((b) => b + delta);

      // atualiza métricas do dia
      const today = new Date().toDateString();
      if (new Date(payload.date).toDateString() === today) {
        if (delta > 0) setIncomeToday((x) => (x ?? 0) + Math.abs(delta));
        else setExpenseToday((x) => (x ?? 0) + Math.abs(delta));
      }

      // contexto para possível rollback
      return { previousBalance: prev };
    },
    onError: (_err, _payload, context) => {
      // rollback do cache
      if (context?.previousBalance !== undefined) {
        qc.setQueryData(["balance", userId], context.previousBalance);
        setBalance(toNumberBalance(context.previousBalance));
      }
    },
    onSuccess: async () => {
      // opcional: se o backend recalcula saldo, preferir revalidar
      await qc.invalidateQueries({ queryKey: ["balance", userId] });
    },
  });

  async function onCreate(payload: ICreateTransactionPayload): Promise<TransactionEntity> {
    // Garante que o payload tenha userId/category se seu backend exigir
    const enriched: ICreateTransactionPayload = {
      ...payload,
      // se você já injeta userId no backend via cookie, pode remover
      // userId,
      // defaultCategoryId fallback
      categoryId: payload.categoryId ?? defaultCategoryId,
    };

    const res = await createTxMutation.mutateAsync(enriched);
    return res;
  }

  // 4) Refresh correto (sem chamar hook dentro de função)
  const handleRefresh = async () => {
    setLoading(true);
    await refetchBalance();
    setAvailable(0);
    setLoading(false);
  };

  // Loading/guardas
  if (loadingSession) return <div className="p-6">Carregando sessão…</div>;
  if (!userId) return <div className="p-6">Você precisa entrar.</div>;
  if (loadingBalance && balance === 0) {
    return <div className="p-6">Carregando saldo…</div>;
  }

  return (
    <div className="grid gap-6">
      <BankBalanceCard
        balance={balance}
        available={available}
        incomeToday={incomeToday}
        expenseToday={expenseToday}
        accountLabel="Conta Corrente •••• 8172"
        onRefresh={handleRefresh}
        loading={loading}
        onCreateTransaction={onCreate}
        userId={userId}
        defaultCategoryId={defaultCategoryId}
      />
      {/* Outros cards/KPIs… */}
    </div>
  );
}
