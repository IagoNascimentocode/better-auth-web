// src/pages/DashboardPage.tsx
import React from "react";
import type { ICreateTransactionPayload, TransactionEntity } from "../features/transactions/types";
import { createTransaction } from "../features/transactions/api";
import BankBalanceCard from "../components/BankBalanceCard";


export default function DashboardPage() {
  const [balance, setBalance] = React.useState(12500.45);
  const [available, setAvailable] = React.useState(12000);
  const [incomeToday, setIncomeToday] = React.useState(349.9);
  const [expenseToday, setExpenseToday] = React.useState(120.0);
  const [loading, setLoading] = React.useState(false);

  const userId = "0199f54d-b9e6-7000-9cb6-ca7c21ca0fcc";
  const defaultCategoryId = "2db3bf90-d8e9-45de-b1d1-8e8ab9c749dd";

  async function onCreate(payload: ICreateTransactionPayload): Promise<TransactionEntity> {
    // Exemplo de otimista simples (opcional)
    const v = Number(payload.amount) * (payload.type === "income" ? 1 : -1);
    setBalance((b) => b + v);
    setAvailable((a) => (a ?? 0) + v);
    const today = new Date().toDateString();
    if (new Date(payload.date).toDateString() === today) {
      if (v > 0) setIncomeToday((x) => (x ?? 0) + Math.abs(v));
      else setExpenseToday((x) => (x ?? 0) + Math.abs(v));
    }
    try {
      return await createTransaction(payload);
    } catch (e) {
      // rollback básico
      setBalance((b) => b - v);
      setAvailable((a) => (a ?? 0) - v);
      if (new Date(payload.date).toDateString() === today) {
        if (v > 0) setIncomeToday((x) => (x ?? 0) - Math.abs(v));
        else setExpenseToday((x) => (x ?? 0) - Math.abs(v));
      }
      throw e;
    }
  }

  const handleRefresh = async () => {
    setLoading(true);
    await new Promise((r) => setTimeout(r, 700));
    setLoading(false);
  };

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
      {/* Aqui você pode adicionar outros cards de KPI, gráfico, etc. */}
    </div>
  );
}
