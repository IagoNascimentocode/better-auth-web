// src/pages/DashboardPage.tsx
import React from "react";
import { useSession } from "../lib/useSession";
import { useBalance } from "../features/users/hooks";
import BankBalanceCard from "../components/BankBalanceCard";
import { useCreateTransaction } from "../features/transactions/mutations";
import type { ICreateTransactionPayload } from "../features/transactions/types";

const DEFAULT_CATEGORY_ID = import.meta.env.VITE_DEFAULT_CATEGORY_ID ?? "2db3bf90-d8e9-45de-b1d1-8e8ab9c749dd";

export default function DashboardPage() {
  const { data: session, isLoading: loadingSession } = useSession();
  const userId = session?.user?.id ?? "";

  const { data: balance = 0, isFetching: fetchingBalance, refetch } = useBalance(userId, { enabled: !!userId });
  const createTx = useCreateTransaction(userId);

  // métricas locais (mantidas bem simples aqui)
  const [available, setAvailable] = React.useState<number>(12000);
  const [incomeToday, setIncomeToday] = React.useState<number>(349.9);
  const [expenseToday, setExpenseToday] = React.useState<number>(120.0);

  async function onCreate(payload: ICreateTransactionPayload) {
    const enriched = { ...payload, categoryId: payload.categoryId ?? DEFAULT_CATEGORY_ID };
    const delta = Number(enriched.amount) * (enriched.type === "income" ? 1 : -1);
    const isToday = new Date(enriched.date).toDateString() === new Date().toDateString();

    const rollback = {
      incomeToday,
      expenseToday,
    };

    if (isToday) {
      if (delta > 0) setIncomeToday((v) => v + Math.abs(delta));
      else setExpenseToday((v) => v + Math.abs(delta));
    }

    try {
      await createTx.mutateAsync(enriched);
    } catch (err) {
      // rollback de métricas se falhar
      setIncomeToday(rollback.incomeToday);
      setExpenseToday(rollback.expenseToday);
      throw err;
    }
  }

  const handleRefresh = async () => {
    await refetch();
    // exemplo: recalcular disponível conforme política
    setAvailable((a) => a);
  };

  if (loadingSession) return <div className="p-6">Carregando sessão…</div>;
  if (!userId) return <div className="p-6">Você precisa entrar.</div>;

  return (
    <div className="grid gap-6">
      <BankBalanceCard
        balance={balance}
        available={available}
        incomeToday={incomeToday}
        expenseToday={expenseToday}
        accountLabel="Conta Corrente •••• 8172"
        onRefresh={handleRefresh}
        loading={fetchingBalance || createTx.isPending}
        onCreateTransaction={onCreate}
        userId={userId}
        defaultCategoryId={DEFAULT_CATEGORY_ID}
      />
    </div>
  );
}
