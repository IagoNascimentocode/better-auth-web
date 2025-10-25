// ===============================
// frontend/transactions wiring
// ===============================
// Este snippet mostra:
// 1) Um client minimalista de API (fetch)
// 2) A função createTransaction(payload)
// 3) O componente BankBalanceCard com suporte a criação de transações
// 4) Um demo Page que conecta tudo (com userId/categoryId de exemplo)
//
// Observação:
// - O backend espera amount como string e date como string (ISO).
// - No exemplo, os botões "Adicionar" e "Transferir" realizam chamadas reais
//   para criar transações (income/expense) e fazem atualização otimista do UI
//   com rollback em caso de erro.

// ---------- 1) API Client
export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    method: init?.method ?? "POST",
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    body: init?.body,
    credentials: "include",
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `Request failed: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

// ---------- 2) Serviço: createTransaction
export type TransactionType = "income" | "expense";

export interface ICreateTransactionPayload {
  title: string; // 1..256
  amount: string; // ex: "123.45"
  type: TransactionType; // "income" | "expense"
  date: string; // ISO string
  notes?: string;
  categoryId: string; // uuid
  userId: string; // uuid
}

export interface TransactionEntity {
  id: string;
  title: string;
  amount: string; // string vinda do banco
  type: TransactionType;
  date: string; // ISO
  notes?: string | null;
  categoryId: string;
  userId: string;
  createdAt?: string;
  updatedAt?: string;
}

export async function createTransaction(
  payload: ICreateTransactionPayload
): Promise<TransactionEntity> {
  // Ajuste a URL conforme sua API (ex.: "/api/transactions/create")
  const data = await api<TransactionEntity[]>("http://localhost:3333/transactions/create", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  console.log("data", data);
  // seu backend retorna .returning() — normalmente um array com 1 registro
  return Array.isArray(data) ? data[0] : (data as unknown as TransactionEntity);
}

// ---------- 3) Componente: BankBalanceCard (com suporte a criação de transações)
import React, { useMemo, useState } from "react";
import { ArrowDownRight, ArrowUpRight, Eye, EyeOff, RefreshCw, Wallet, Plus, Send } from "lucide-react";

export type BankBalanceCardProps = {
  /** Saldo atual da conta (em unidades monetárias, ex: 1234.56) */
  balance: number;
  /** Valor disponível para uso imediato (opcional) */
  available?: number;
  /** Entradas do dia (opcional) */
  incomeToday?: number;
  /** Saídas do dia (opcional) */
  expenseToday?: number;
  /** Rótulo da conta (ex.: "Conta Corrente •••• 1234") */
  accountLabel?: string;
  /** Código da moeda, ex.: "BRL", "USD" */
  currency?: string;
  /** Locale para formatação, ex.: "pt-BR", "en-US" */
  locale?: string;
  /** Estado de carregamento (exibe skeleton/loader) */
  loading?: boolean;
  /** Clique em Depositar / Adicionar dinheiro */
  onDeposit?: () => void;
  /** Clique em Transferir / Pagar */
  onTransfer?: () => void;
  /** Atualizar saldos */
  onRefresh?: () => void | Promise<void>;
  /** Classe extra para estilização */
  className?: string;
  /** Novo: callback para criar transações no backend */
  onCreateTransaction?: (payload: ICreateTransactionPayload) => Promise<TransactionEntity>;
  /** Novo: dados mínimos para criar transações rápidas */
  userId?: string;
  defaultCategoryId?: string;
};

export default function BankBalanceCard({
  balance,
  available,
  incomeToday,
  expenseToday,
  accountLabel = "Conta •••• 1234",
  currency = "BRL",
  locale = "pt-BR",
  loading = false,
  onDeposit,
  onTransfer,
  onRefresh,
  className = "",
  onCreateTransaction,
  userId,
  defaultCategoryId,
}: BankBalanceCardProps) {
  const [hidden, setHidden] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [posting, setPosting] = useState<null | "income" | "expense">(null);

  const fmt = useMemo(
    () => new Intl.NumberFormat(locale, { style: "currency", currency }),
    [locale, currency]
  );

  const mask = (v?: number) => (hidden ? "••••" : v != null ? fmt.format(v) : "—");

  async function handleRefresh() {
    if (!onRefresh) return;
    try {
      setRefreshing(true);
      await onRefresh();
    } finally {
      setRefreshing(false);
    }
  }

  // Helpers para transações rápidas (valores exemplo: +100 e -50)
  async function quickIncome(amount = 100) {
    if (!onCreateTransaction || !userId || !defaultCategoryId) return onDeposit?.();
    try {
      setPosting("income");
      const payload: ICreateTransactionPayload = {
        title: "Depósito rápido",
        amount: amount.toFixed(2),
        type: "income",
        date: new Date().toISOString(),
        notes: "Gerado pelo atalho do cartão",
        categoryId: defaultCategoryId,
        userId,
      };
      await onCreateTransaction(payload);
      // caso o pai não faça atualização automática, você pode emitir um evento via prop
      onDeposit?.();
    } finally {
      setPosting(null);
    }
  }

  async function quickExpense(amount = 50) {
    if (!onCreateTransaction || !userId || !defaultCategoryId) return onTransfer?.();
    try {
      setPosting("expense");
      const payload: ICreateTransactionPayload = {
        title: "Transferência rápida",
        amount: amount.toFixed(2),
        type: "expense",
        date: new Date().toISOString(),
        notes: "Gerado pelo atalho do cartão",
        categoryId: defaultCategoryId,
        userId,
      };
      await onCreateTransaction(payload);
      onTransfer?.();
    } finally {
      setPosting(null);
    }
  }

  return (
    <div
      className={
        "relative overflow-hidden rounded-2xl p-5 sm:p-6 shadow-xl bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-800 border border-zinc-700/40 " +
        className
      }
      role="region"
      aria-label="Cartão de saldo da conta"
    >
      {/* Glow decorativo */}
      <div className="pointer-events-none absolute -top-20 -right-20 h-56 w-56 rounded-full bg-emerald-500/10 blur-3xl" />

      {/* Cabeçalho */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 text-zinc-200">
          <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-zinc-800 border border-zinc-700/60">
            <Wallet className="h-5 w-5" aria-hidden="true" />
          </div>
          <div className="leading-tight">
            <p className="text-xs uppercase tracking-wide text-zinc-400">Saldo disponível</p>
            <p className="text-sm font-medium text-zinc-300">{accountLabel}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setHidden((s) => !s)}
            className="inline-flex items-center gap-1 rounded-xl border border-zinc-700/60 bg-zinc-800 px-3 py-2 text-xs font-medium text-zinc-200 hover:bg-zinc-700 transition active:scale-[0.99]"
            aria-pressed={hidden}
            aria-label={hidden ? "Mostrar valores" : "Ocultar valores"}
          >
            {hidden ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
            {hidden ? "Mostrar" : "Ocultar"}
          </button>

          {onRefresh && (
            <button
              type="button"
              onClick={handleRefresh}
              className={`inline-flex items-center rounded-xl border border-zinc-700/60 bg-zinc-800 p-2 text-zinc-200 hover:bg-zinc-700 transition active:scale-[0.99] ${
                refreshing ? "animate-spin" : ""
              }`}
              aria-label="Atualizar"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Valor principal */}
      <div className="mt-4 sm:mt-5">
        <div className="text-4xl sm:text-5xl font-semibold tracking-tight text-zinc-50 tabular-nums">
          {loading ? (
            <div className="h-10 sm:h-12 w-48 animate-pulse rounded-lg bg-zinc-700/40" />
          ) : (
            mask(balance)
          )}
        </div>
        <p className="mt-1 text-sm text-zinc-400">
          Disponível: <span className="font-medium text-zinc-300">{loading ? "—" : mask(available ?? balance)}</span>
        </p>
      </div>

      {/* Entradas/Saídas do dia */}
      <div className="mt-5 grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-3">
          <div className="flex items-center gap-2 text-emerald-400">
            <ArrowDownRight className="h-4 w-4" />
            <span className="text-xs uppercase tracking-wide">Entradas hoje</span>
          </div>
          <div className="mt-1 text-lg font-semibold text-emerald-300 tabular-nums">
            {loading ? "—" : mask(incomeToday ?? 0)}
          </div>
        </div>
        <div className="rounded-2xl border border-rose-500/20 bg-rose-500/5 p-3">
          <div className="flex items-center gap-2 text-rose-400">
            <ArrowUpRight className="h-4 w-4" />
            <span className="text-xs uppercase tracking-wide">Saídas hoje</span>
          </div>
          <div className="mt-1 text-lg font-semibold text-rose-300 tabular-nums">
            {loading ? "—" : mask(expenseToday ?? 0)}
          </div>
        </div>
      </div>

      {/* Ações rápidas */}
      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => quickIncome(100)}
          disabled={!!posting}
          className="inline-flex items-center gap-2 rounded-2xl bg-emerald-500 px-4 py-2 font-semibold text-emerald-950 shadow-sm hover:brightness-95 active:scale-[0.99] disabled:opacity-50 disabled:pointer-events-none"
        >
          <Plus className="h-4 w-4" /> {posting === "income" ? "Adicionando…" : "Adicionar"}
        </button>
        <button
          type="button"
          onClick={() => quickExpense(50)}
          disabled={!!posting}
          className="inline-flex items-center gap-2 rounded-2xl border border-zinc-700/60 bg-zinc-800 px-4 py-2 font-semibold text-zinc-200 shadow-sm hover:bg-zinc-700 active:scale-[0.99] disabled:opacity-50 disabled:pointer-events-none"
        >
          <Send className="h-4 w-4" /> {posting === "expense" ? "Transferindo…" : "Transferir"}
        </button>
      </div>
    </div>
  );
}

// ---------- 4) Demo Page conectando tudo
export function BankBalanceCardDemo() {
  const [balance, setBalance] = React.useState(12500.45);
  const [available, setAvailable] = React.useState(12000);
  const [incomeToday, setIncomeToday] = React.useState(349.9);
  const [expenseToday, setExpenseToday] = React.useState(120.0);
  const [loading, setLoading] = React.useState(false);
  const [toast, setToast] = React.useState<string | null>(null);

  // mocked (troque pelos reais do seu contexto/autenticação)
  const userId = "0199f54d-b9e6-7000-9cb6-ca7c21ca0fcc";
  const defaultCategoryId = "5a1bced4-06e4-42b1-bd01-73d508d9c8e7";

  function notify(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 1400);
  }

  // Atualizações otimistas para os atalhos
  async function onCreateTransaction(payload: ICreateTransactionPayload) {
    const isIncome = payload.type === "income";
    // snapshot para rollback
    const snap = {
      balance,
      available: available ?? 0,
      incomeToday: incomeToday ?? 0,
      expenseToday: expenseToday ?? 0,
    };

    // otimista
    if (isIncome) {
      const v = Number(payload.amount);
      setBalance((b) => b + v);
      setAvailable((a) => (a ?? 0) + v);
      setIncomeToday((x) => (x ?? 0) + v);
      notify(`+ ${v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} adicionados`);
    } else {
      const v = Number(payload.amount);
      setBalance((b) => b - v);
      setAvailable((a) => (a ?? 0) - v);
      setExpenseToday((x) => (x ?? 0) + v);
      notify(`- ${v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} transferidos`);
    }

    try {
      const result = await createTransaction(payload);
      return result;
    } catch (err: any) {
      // rollback
      setBalance(snap.balance);
      setAvailable(snap.available);
      setIncomeToday(snap.incomeToday);
      setExpenseToday(snap.expenseToday);
      notify("Falha ao criar transação");
      throw err;
    }
  }

  const handleRefresh = async () => {
    setLoading(true);
    await new Promise((r) => setTimeout(r, 700));
    setLoading(false);
  };

  return (
    <div className="max-w-md mx-auto p-6">
      <BankBalanceCard
        balance={balance}
        available={available}
        incomeToday={incomeToday}
        expenseToday={expenseToday}
        accountLabel="Conta Corrente •••• 8172"
        onRefresh={handleRefresh}
        loading={loading}
        onCreateTransaction={onCreateTransaction}
        userId={userId}
        defaultCategoryId={defaultCategoryId}
        // onDeposit / onTransfer abaixo ainda são chamados após a criação
        onDeposit={() => {/* extra side-effects opcionais */}}
        onTransfer={() => {/* extra side-effects opcionais */}}
      />

      {toast && (
        <div className="mt-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 px-3 py-2 text-sm text-emerald-300">
          {toast}
        </div>
      )}
    </div>
  );
}
