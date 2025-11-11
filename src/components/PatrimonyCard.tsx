import React from "react";
import { Eye, EyeOff, RefreshCw, Plus, Send, Wallet } from "lucide-react";
import CreateTransactionModal from "./transactions/CreateTransactionModal";
import type { ICreateTransactionPayload, TransactionType } from "../features/transactions/types";

const PATRIMONY_BLUE = "#3b82f6"; // azul

function formatCurrency(amount: number, currency: "BRL" | "USD") {
  return new Intl.NumberFormat(currency === "BRL" ? "pt-BR" : "en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(amount);
}

export default function PatrimonyCard({
  label,
  totalBRL,
  loading,
  onRefresh,
  onCreate,
  userId,
  defaultCategoryId,
}: {
  label: string;
  totalBRL: number;
  loading?: boolean;
  onRefresh?: () => void | Promise<void>;
  onCreate?: (payload: ICreateTransactionPayload) => Promise<void>;
  userId?: string;
  defaultCategoryId?: string;
}) {
  const [hidden, setHidden] = React.useState(false);
  const [refreshing, setRefreshing] = React.useState(false);
  const [createOpen, setCreateOpen] = React.useState(false);
  const [prefillType, setPrefillType] = React.useState<TransactionType>("income");

  const maskBRL = (v?: number) =>
    hidden ? "••••" : v != null ? formatCurrency(v, "BRL") : "—";

  async function handleRefresh() {
    if (!onRefresh) return;
    try {
      setRefreshing(true);
      await onRefresh();
    } finally {
      setRefreshing(false);
    }
  }

  function openCreate(type: TransactionType) {
    if (!onCreate || !userId || !defaultCategoryId) return;
    setPrefillType(type);
    setCreateOpen(true);
  }

  return (
    <div className="relative overflow-hidden rounded-2xl p-5 sm:p-6 shadow-2xl bg-zinc-950 border border-zinc-900">
      <div
        className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full blur-3xl"
        style={{ backgroundColor: `${PATRIMONY_BLUE}22` }}
      />

      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 text-zinc-200">
          <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-zinc-900 border border-zinc-800">
            <Wallet className="h-5 w-5" aria-hidden="true" />
          </div>
          <div className="leading-tight">
            <p className="text-xs uppercase tracking-wide text-zinc-400">
              Patrimônio Total
            </p>
            <p className="text-sm font-medium text-zinc-300">{label}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setHidden((s) => !s)}
            className="py-2 px-3 gap-1 border text-xs rounded-xl inline-flex font-medium items-center bg-zinc-900 text-zinc-200 hover:bg-zinc-800 border-zinc-800"
          >
            {hidden ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
            {hidden ? "Mostrar" : "Ocultar"}
          </button>
          {onRefresh && (
            <button
              type="button"
              onClick={handleRefresh}
              className={`inline-flex items-center rounded-xl border border-zinc-800 bg-zinc-900 p-2 text-zinc-200 hover:bg-zinc-800 ${
                refreshing ? "animate-spin" : ""
              }`}
              aria-label="Atualizar"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      <div className="mt-4 sm:mt-5">
        <div className="text-4xl sm:text-5xl font-extrabold tracking-tight text-zinc-50 tabular-nums">
          {loading ? (
            <div className="h-10 sm:h-12 w-48 animate-pulse rounded-lg bg-zinc-800" />
          ) : (
            maskBRL(totalBRL)
          )}
        </div>
        <p className="mt-1 text-sm text-zinc-400">
          Disponível:{" "}
          <span className="font-medium text-zinc-300">
            {loading ? "—" : maskBRL(totalBRL)}
          </span>
        </p>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => openCreate("income")}
          className="inline-flex items-center gap-2 rounded-2xl px-4 py-2 font-semibold text-white shadow-sm active:scale-[0.99]"
          style={{ backgroundColor: PATRIMONY_BLUE }}
        >
          <Plus className="h-4 w-4" /> Adicionar
        </button>
        <button
          type="button"
          onClick={() => openCreate("expense")}
          className="inline-flex items-center gap-2 rounded-2xl border border-zinc-800 bg-zinc-900 px-4 py-2 font-semibold text-zinc-200 shadow-sm hover:bg-zinc-800 active:scale-[0.99]"
        >
          <Send className="h-4 w-4" /> Transferir
        </button>
      </div>

      {onCreate && userId && defaultCategoryId && (
        <CreateTransactionModal
          open={createOpen}
          onClose={() => setCreateOpen(false)}
          defaultType={prefillType}
          userId={userId}
          defaultCategoryId={defaultCategoryId}
          onCreate={onCreate}
        />
      )}
    </div>
  );
}
