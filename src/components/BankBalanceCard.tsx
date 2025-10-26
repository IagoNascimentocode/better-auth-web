// src/components/bank/BankBalanceCard.tsx
import React from "react";
import { ArrowDownRight, ArrowUpRight, Eye, EyeOff, RefreshCw, Wallet, Plus, Send } from "lucide-react";
import type { ICreateTransactionPayload, TransactionEntity, TransactionType } from "../features/transactions/types";
import CreateTransactionModal from "./transactions/CreateTransactionModal";

export type BankBalanceCardProps = {
  balance: number;
  available?: number;
  incomeToday?: number;
  expenseToday?: number;
  accountLabel?: string;
  currency?: string;
  locale?: string;
  loading?: boolean;
  onRefresh?: () => void | Promise<void>;
  className?: string;
  onCreateTransaction?: (payload: ICreateTransactionPayload) => Promise<TransactionEntity>;
  userId?: string;
  defaultCategoryId?: string;
};

export default function BankBalanceCard(props: BankBalanceCardProps) {
  const {
    balance, available, incomeToday, expenseToday,
    accountLabel = "Conta •••• 1234", currency = "BRL", locale = "pt-BR",
    loading = false, onRefresh, className = "",
    onCreateTransaction, userId, defaultCategoryId,
  } = props;

  const [hidden, setHidden] = React.useState(false);
  const [refreshing, setRefreshing] = React.useState(false);

  const [createOpen, setCreateOpen] = React.useState(false);
  const [prefillType, setPrefillType] = React.useState<TransactionType>("income");

  const fmt = React.useMemo(
    () => new Intl.NumberFormat(locale, { style: "currency", currency }),
    [locale, currency]
  );
  const mask = (v?: number) => (hidden ? "••••" : v != null ? fmt.format(v) : "—");

  async function handleRefresh() {
    if (!onRefresh) return;
    try { setRefreshing(true); await onRefresh(); } finally { setRefreshing(false); }
  }
  function openCreate(type: TransactionType) {
    if (!onCreateTransaction || !userId || !defaultCategoryId) return;
    setPrefillType(type); setCreateOpen(true);
  }

  return (
    <div className={`relative overflow-hidden rounded-2xl p-5 sm:p-6 shadow-xl bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-800 border border-zinc-700/40 ${className}`}>
      <div className="pointer-events-none absolute -top-20 -right-20 h-56 w-56 rounded-full bg-emerald-500/10 blur-3xl" />

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
          <button type="button" onClick={() => setHidden((s) => !s)}
                  className="inline-flex items-center gap-1 rounded-xl border border-zinc-700/60 bg-zinc-800 px-3 py-2 text-xs font-medium text-zinc-200 hover:bg-zinc-700">
            {hidden ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
            {hidden ? "Mostrar" : "Ocultar"}
          </button>
          {onRefresh && (
            <button type="button" onClick={handleRefresh}
                    className={`inline-flex items-center rounded-xl border border-zinc-700/60 bg-zinc-800 p-2 text-zinc-200 hover:bg-zinc-700 ${refreshing ? "animate-spin" : ""}`}
                    aria-label="Atualizar">
              <RefreshCw className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      <div className="mt-4 sm:mt-5">
        <div className="text-4xl sm:text-5xl font-semibold tracking-tight text-zinc-50 tabular-nums">
          {loading ? <div className="h-10 sm:h-12 w-48 animate-pulse rounded-lg bg-zinc-700/40" /> : mask(balance)}
        </div>
        <p className="mt-1 text-sm text-zinc-400">
          Disponível: <span className="font-medium text-zinc-300">{loading ? "—" : mask(available ?? balance)}</span>
        </p>
      </div>

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

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button type="button" onClick={() => openCreate("income")}
                className="inline-flex items-center gap-2 rounded-2xl bg-emerald-500 px-4 py-2 font-semibold text-emerald-950 shadow-sm hover:brightness-95 active:scale-[0.99]">
          <Plus className="h-4 w-4" /> Adicionar
        </button>
        <button type="button" onClick={() => openCreate("expense")}
                className="inline-flex items-center gap-2 rounded-2xl border border-zinc-700/60 bg-zinc-800 px-4 py-2 font-semibold text-zinc-200 shadow-sm hover:bg-zinc-700 active:scale-[0.99]">
          <Send className="h-4 w-4" /> Transferir
        </button>
      </div>

      {onCreateTransaction && userId && defaultCategoryId && (
        <CreateTransactionModal
          open={createOpen}
          onClose={() => setCreateOpen(false)}
          defaultType={prefillType}
          userId={userId}
          defaultCategoryId={defaultCategoryId}
          onCreate={onCreateTransaction}
        />
      )}
    </div>
  );
}
