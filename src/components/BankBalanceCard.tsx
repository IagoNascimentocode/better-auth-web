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
};

/**
 * Cartão de saldo estilo app bancário — pronto para produção.
 * - Visual moderno (Tailwind), com foco em acessibilidade.
 * - Botão para ocultar/mostrar valores (Eye/EyeOff).
 * - Entradas e saídas do dia.
 * - Ações rápidas: Adicionar e Transferir.
 * - Botão de atualizar com animação de rotação.
 */
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
}: BankBalanceCardProps) {
  const [hidden, setHidden] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

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
          onClick={onDeposit}
          className="inline-flex items-center gap-2 rounded-2xl bg-emerald-500 px-4 py-2 font-semibold text-emerald-950 shadow-sm hover:brightness-95 active:scale-[0.99] disabled:opacity-50 disabled:pointer-events-none"
        >
          <Plus className="h-4 w-4" /> Adicionar
        </button>
        <button
          type="button"
          onClick={onTransfer}
          className="inline-flex items-center gap-2 rounded-2xl border border-zinc-700/60 bg-zinc-800 px-4 py-2 font-semibold text-zinc-200 shadow-sm hover:bg-zinc-700 active:scale-[0.99] disabled:opacity-50 disabled:pointer-events-none"
        >
          <Send className="h-4 w-4" /> Transferir
        </button>
      </div>
    </div>
  );
}

// --- Playground rápido (demo) ---
// Crie uma página temporária e importe este componente para testar.
// Ex.:
// import BankBalanceCard, { BankBalanceCardDemo } from "./BankBalanceCard";
// export default function Page() { return <BankBalanceCardDemo /> }

export function BankBalanceCardDemo() {
  const [balance, setBalance] = React.useState(12500.45);
  const [available, setAvailable] = React.useState(12000);
  const [incomeToday, setIncomeToday] = React.useState(349.9);
  const [expenseToday, setExpenseToday] = React.useState(120.0);
  const [loading, setLoading] = React.useState(false);
  const [toast, setToast] = React.useState<string | null>(null);

  function notify(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 1200);
  }

  const handleDeposit = () => {
    setBalance((b) => b + 100);
    setAvailable((a) => (a ?? 0) + 100);
    setIncomeToday((v) => (v ?? 0) + 100);
    notify("+ R$ 100 adicionados");
  };

  const handleTransfer = () => {
    setBalance((b) => b - 50);
    setAvailable((a) => (a ?? 0) - 50);
    setExpenseToday((v) => (v ?? 0) + 50);
    notify("Transferência de R$ 50 realizada");
  };

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
        onDeposit={handleDeposit}
        onTransfer={handleTransfer}
        onRefresh={handleRefresh}
        loading={loading}
      />

      {toast && (
        <div className="mt-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 px-3 py-2 text-sm text-emerald-300">
          {toast}
        </div>
      )}
    </div>
  );
}
