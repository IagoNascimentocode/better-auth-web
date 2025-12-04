import React from "react";
import { useSession } from "../lib/useSession";
import {
  Wallet,
  BarChart2,
  CalendarRange,
  TrendingUp,
  CheckCircle2,
  Clock4,
} from "lucide-react";
import type { OperationType } from "../features/health-hub/types";
import {
  formatCurrencyBRL,
  formatDateRangeWithTilde,
  percent,
  toInputDate,
  WEALTH_RANGE_STORAGE_KEY,
} from "../features/health-hub/utils";
import { useWealthOverview } from "../features/health-hub/hooks";
import { Card, ProgressBar } from "../components/health-hub/Card";
import { api } from "../lib/http";

// helper pra converter datetime-local em ISO
function toISO(dateTime: string) {
  if (!dateTime) return "";
  return new Date(dateTime).toISOString();
}

type Category = {
  id: string;
  name: string;
};

type Asset = {
  id: string;
  name: string;
  type: string;
  description?: string | null;
};

export default function WealthHubPage() {
  const { data: session, isLoading: loadingSession } = useSession();
  const userId = session?.user?.id ?? "";

  // ===== Filtro de datas (range) =====
  const year = React.useMemo(() => new Date().getFullYear(), []);
  const yearStart = React.useMemo(() => new Date(year, 0, 1), [year]);
  const yearEnd = React.useMemo(() => new Date(year, 11, 31), [year]);

  // valores "aplicados" (usados na API)
  const [from, setFrom] = React.useState<string>("");
  const [to, setTo] = React.useState<string>("");

  // valores que o usuário está digitando no input
  const [fromInput, setFromInput] = React.useState<string>("");
  const [toInputValue, setToInputValue] = React.useState<string>("");

  // filtro de tipo de operação
  const [operationType, setOperationType] =
    React.useState<OperationType | undefined>(undefined);

  // ===== CATEGORIAS & ASSETS =====
  const [categories, setCategories] = React.useState<Category[]>([]);
  const [loadingCategories, setLoadingCategories] = React.useState(false);
  const [assets, setAssets] = React.useState<Asset[]>([]);
  const [loadingAssets, setLoadingAssets] = React.useState(false);

  React.useEffect(() => {
    if (!userId) return;
    let cancelled = false;

    async function loadCategories() {
      try {
        setLoadingCategories(true);
        const data = await api<Category[]>(
          `/categories/list/${userId}`,
          { method: "GET" }
        );
        if (!cancelled) {
          setCategories(data);
        }
      } catch (err) {
        console.error("[WealthHub] Erro ao carregar categorias", err);
      } finally {
        if (!cancelled) setLoadingCategories(false);
      }
    }

    loadCategories();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  React.useEffect(() => {
    let cancelled = false;

    async function loadAssets() {
      try {
        setLoadingAssets(true);
        const data = await api<Asset[]>(`/assets/list`, { method: "GET" });
        if (!cancelled) {
          setAssets(data);
        }
      } catch (err) {
        console.error("[WealthHub] Erro ao carregar assets", err);
      } finally {
        if (!cancelled) setLoadingAssets(false);
      }
    }

    loadAssets();
    return () => {
      cancelled = true;
    };
  }, []);

  // ===== MODAIS (abertos/fechados) =====
  const [showTransactionModal, setShowTransactionModal] = React.useState(false);
  const [showExpenseModal, setShowExpenseModal] = React.useState(false);
  const [showInvestmentModal, setShowInvestmentModal] = React.useState(false);

  // ===== FORM: transação =====
  const [transactionForm, setTransactionForm] = React.useState({
    title: "",
    amount: "",
    type: "income" as "income" | "expense",
    date: "",
    notes: "",
    categoryId: "",
  });
  const [creatingTransaction, setCreatingTransaction] = React.useState(false);

  async function handleSubmitTransaction(e: React.FormEvent) {
    e.preventDefault();
    if (!userId) return;

    try {
      setCreatingTransaction(true);

      await api("/transactions/create", {
        method: "POST",
        body: JSON.stringify({
          title: transactionForm.title,
          amount: transactionForm.amount, // string, conforme sua rota
          type: transactionForm.type,
          date: toISO(transactionForm.date),
          notes: transactionForm.notes || undefined,
          categoryId: transactionForm.categoryId,
          userId,
        }),
      });

      console.log("[WealthHub] Transação criada com sucesso");
      setShowTransactionModal(false);
      setTransactionForm({
        title: "",
        amount: "",
        type: "income",
        date: "",
        notes: "",
        categoryId: "",
      });

      // TODO: refetch overview
    } catch (err) {
      console.error("[WealthHub] Erro ao criar transação", err);
      alert("Erro ao criar transação. Verifique os dados e tente novamente.");
    } finally {
      setCreatingTransaction(false);
    }
  }

  // ===== FORM: despesa =====
  const [expenseForm, setExpenseForm] = React.useState({
    title: "",
    totalAmount: "",
    installments: "1",
    date: "",
    notes: "",
    categoryId: "",
    operationType: "recurring" as "recurring" | "purchase",
    paymentType: "credit_card" as "credit_card" | "pix",
  });
  const [creatingExpense, setCreatingExpense] = React.useState(false);

  async function handleSubmitExpense(e: React.FormEvent) {
    e.preventDefault();
    if (!userId) return;

    try {
      setCreatingExpense(true);

      await api("/expenses/create", {
        method: "POST",
        body: JSON.stringify({
          title: expenseForm.title,
          totalAmount: Number(expenseForm.totalAmount),
          installments: Number(expenseForm.installments),
          date: toISO(expenseForm.date),
          notes: expenseForm.notes || undefined,
          categoryId: expenseForm.categoryId,
          userId,
          operationType: expenseForm.operationType,
          paymentType: expenseForm.paymentType,
        }),
      });

      console.log("[WealthHub] Despesa criada com sucesso");
      setShowExpenseModal(false);
      setExpenseForm({
        title: "",
        totalAmount: "",
        installments: "1",
        date: "",
        notes: "",
        categoryId: "",
        operationType: "recurring",
        paymentType: "credit_card",
      });

      // TODO: refetch overview
    } catch (err) {
      console.error("[WealthHub] Erro ao criar despesa", err);
      alert("Erro ao criar despesa. Verifique os dados e tente novamente.");
    } finally {
      setCreatingExpense(false);
    }
  }

  // ===== FORM: investimento =====
  const [investmentForm, setInvestmentForm] = React.useState({
    assetId: "",
    date: "",
    operationType: "buy" as "buy" | "sell",
    amount: "",
    price: "",
    total: "",
    isCashMovement: true,
    notes: "",
  });
  const [creatingInvestment, setCreatingInvestment] = React.useState(false);

  async function handleSubmitInvestment(e: React.FormEvent) {
    e.preventDefault();
    if (!userId) return;

    try {
      setCreatingInvestment(true);

      await api("/investment-transactions/create", {
        method: "POST",
        body: JSON.stringify({
          userId,
          assetId: investmentForm.assetId,
          date: toISO(investmentForm.date),
          operationType: investmentForm.operationType,
          amount: Number(investmentForm.amount),
          price: Number(investmentForm.price),
          total: Number(investmentForm.total),
          isCashMovement: investmentForm.isCashMovement,
          notes: investmentForm.notes || undefined,
        }),
      });

      console.log("[WealthHub] Investimento criado com sucesso");
      setShowInvestmentModal(false);
      setInvestmentForm({
        assetId: "",
        date: "",
        operationType: "buy",
        amount: "",
        price: "",
        total: "",
        isCashMovement: true,
        notes: "",
      });

      // TODO: refetch overview
    } catch (err) {
      console.error("[WealthHub] Erro ao criar investimento", err);
      alert("Erro ao criar investimento. Verifique os dados e tente novamente.");
    } finally {
      setCreatingInvestment(false);
    }
  }

  // carrega range inicial do localStorage (ou ano vigente)
  React.useEffect(() => {
    if (!userId) return;

    const key = WEALTH_RANGE_STORAGE_KEY(userId);
    let initialFrom = "";
    let initialTo = "";

    if (typeof window !== "undefined") {
      const raw = window.localStorage.getItem(key);
      if (raw) {
        try {
          const parsed = JSON.parse(raw) as { from?: string; to?: string };
          if (parsed.from && parsed.to) {
            initialFrom = parsed.from;
            initialTo = parsed.to;
          } else {
            window.localStorage.removeItem(key);
          }
        } catch {
          window.localStorage.removeItem(key);
        }
      }
    }

    // se não tinha nada salvo, usa ano vigente
    if (!initialFrom || !initialTo) {
      initialFrom = toInputDate(yearStart);
      initialTo = toInputDate(yearEnd);
    }

    setFrom(initialFrom);
    setTo(initialTo);
    setFromInput(initialFrom);
    setToInputValue(initialTo);
  }, [userId, yearStart, yearEnd]);

  // persiste sempre que o range aplicado muda
  React.useEffect(() => {
    if (!userId || !from || !to) return;
    if (typeof window === "undefined") return;

    const key = WEALTH_RANGE_STORAGE_KEY(userId);
    window.localStorage.setItem(key, JSON.stringify({ from, to }));
  }, [userId, from, to]);

  const { data, loading, error, lastUpdated } = useWealthOverview(
    userId,
    from,
    to,
    operationType
  );

  function applyDateRange() {
    if (!fromInput || !toInputValue) return;

    console.log("[WealthHub] Aplicar filtro", {
      fromInput,
      toInputValue,
      operationType,
    });

    setFrom(fromInput);
    setTo(toInputValue);
  }

  console.log("[WealthHub] Render", {
    userId,
    from,
    to,
    operationType,
    hasData: !!data,
  });

  if (loadingSession) {
    return <div className="p-6 text-zinc-200">Carregando sessão…</div>;
  }

  if (!userId) {
    return <div className="p-6 text-zinc-200">Você precisa entrar.</div>;
  }

  if (error) {
    return (
      <div className="space-y-3 p-6 text-zinc-200">
        <p className="text-sm text-red-400">
          Ocorreu um erro ao carregar o Wealth Hub:
        </p>
        <pre className="whitespace-pre-wrap rounded-xl bg-zinc-900 p-3 text-xs text-zinc-300">
          {error}
        </pre>
      </div>
    );
  }

  if (loading && !data) {
    return <div className="p-6 text-zinc-200">Carregando Wealth Hub…</div>;
  }

  if (!data) {
    return (
      <div className="p-6 text-zinc-200">
        Nenhum dado retornado para esse período.
      </div>
    );
  }

  const { positions, period, expenses, installments, rates } = data;

  const totalInvested = positions.reduce((acc, p) => acc + p.invested, 0);
  const totalInstallments = installments.totalPaid + installments.totalPending;
  const paidPercent = percent(installments.totalPaid, totalInstallments);

  const operationTypeLabel =
    operationType === "purchase"
      ? "Compras únicas"
      : operationType === "recurring"
      ? "Recorrentes"
      : "Todas as operações";

  return (
    <div className="space-y-5">
      {/* Header + barra de filtro usando largura toda */}
      <header className="space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold text-zinc-50">
              <Wallet className="h-6 w-6 text-emerald-400" />
              Wealth Hub
            </h1>
            <p className="mt-1 text-sm text-zinc-400">
              Visão consolidada do seu patrimônio, gastos e parcelas.
            </p>

            {rates && (
              <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-zinc-500">
                <span>
                  BTC/USD:&nbsp;
                  <span className="font-mono text-zinc-200">
                    {new Intl.NumberFormat("en-US", {
                      style: "currency",
                      currency: "USD",
                      maximumFractionDigits: 0,
                    }).format(rates.btc_usd)}
                  </span>
                </span>
                <span>
                  BTC/BRL:&nbsp;
                  <span className="font-mono text-zinc-200">
                    {formatCurrencyBRL(rates.btc_brl)}
                  </span>
                </span>
                <span>
                  USD/BRL:&nbsp;
                  <span className="font-mono text-zinc-200">
                    {rates.usd_brl.toFixed(3)}
                  </span>
                </span>
                {lastUpdated && (
                  <span className="text-[10px] text-zinc-500">
                    Atualizado em{" "}
                    {new Date(lastUpdated).toLocaleTimeString("pt-BR")}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* AÇÕES RÁPIDAS */}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setShowTransactionModal(true)}
              className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-emerald-50 shadow-sm hover:bg-emerald-500 active:scale-[0.98]"
            >
              Nova transação
            </button>
            <button
              type="button"
              onClick={() => setShowExpenseModal(true)}
              className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-zinc-100 hover:border-emerald-500 hover:text-emerald-300 active:scale-[0.98]"
            >
              Despesa recorrente
            </button>
            <button
              type="button"
              onClick={() => setShowInvestmentModal(true)}
              className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-zinc-100 hover:border-emerald-500 hover:text-emerald-300 active:scale-[0.98]"
            >
              Novo investimento
            </button>
          </div>
        </div>

        {/* Barra de filtros larga */}
        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-zinc-800 bg-zinc-900/60 px-4 py-3 text-xs text-zinc-300 sm:text-sm">
          <div className="flex items-center gap-2">
            <CalendarRange className="h-4 w-4 text-zinc-400" />
            <span className="font-medium text-zinc-200">Período</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-1">
              <span className="text-zinc-400">De</span>
              <input
                type="date"
                value={fromInput}
                onChange={(e) => setFromInput(e.target.value)}
                className="rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs text-zinc-100 outline-none focus:border-emerald-500"
              />
            </label>
            <span className="text-zinc-500">→</span>
            <label className="flex items-center gap-1">
              <span className="text-zinc-400">Até</span>
              <input
                type="date"
                value={toInputValue}
                onChange={(e) => setToInputValue(e.target.value)}
                className="rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs text-zinc-100 outline-none focus:border-emerald-500"
              />
            </label>

            <button
              type="button"
              onClick={applyDateRange}
              className="rounded-md border border-emerald-500 px-3 py-1 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/10 active:scale-[0.98]"
            >
              Aplicar
            </button>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <span className="text-[10px] font-medium uppercase tracking-wide text-zinc-400">
              Tipo de operação
            </span>
            <select
              value={operationType ?? ""} // "" representa "sem filtro"
              onChange={(e) => {
                const value = e.target.value as OperationType | "";
                setOperationType(value || undefined); // "" -> undefined (não manda)
              }}
              className="rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs text-zinc-100 outline-none focus:border-emerald-500"
            >
              <option value="">Todas</option>
              <option value="purchase">Compras únicas</option>
              <option value="recurring">Recorrentes</option>
            </select>
          </div>
        </div>
      </header>

      {/* Grid principal: usa melhor a tela */}
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Coluna esquerda: Total investido + Posições */}
        <div className="space-y-4">
          <Card
            title="Total Investido"
            icon={<BarChart2 className="h-4 w-4 text-emerald-400" />}
          >
            <p className="text-2xl font-semibold text-zinc-50">
              {formatCurrencyBRL(totalInvested)}
            </p>
            <p className="mt-1 text-xs text-zinc-400">
              Somando todos os ativos cadastrados.
            </p>
          </Card>

          <Card
            title="Posições"
            icon={<BarChart2 className="h-4 w-4 text-zinc-300" />}
          >
            {positions.length === 0 ? (
              <p className="text-sm text-zinc-400">
                Nenhum ativo cadastrado ainda.
              </p>
            ) : (
              <div className="space-y-3">
                {positions.map((pos) => (
                  <div
                    key={pos.assetId}
                    className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-3"
                  >
                    <div className="flex items-baseline justify-between gap-2">
                      <div>
                        <p className="text-xs font-semibold uppercase text-zinc-200">
                          {pos.name}
                        </p>
                        <p className="text-[11px] text-zinc-500">
                          {pos.type === "crypto" ? "Cripto" : pos.type}
                        </p>
                      </div>
                      <p className="text-xs text-zinc-300">
                        Qtde:{" "}
                        <span className="font-mono">{pos.quantity}</span>
                      </p>
                    </div>

                    <div className="mt-2 grid grid-cols-2 gap-2 text-[11px] text-zinc-400">
                      <div className="flex flex-col">
                        <span>Investido</span>
                        <span className="font-semibold text-zinc-100">
                          {formatCurrencyBRL(pos.invested)}
                        </span>
                      </div>
                      <div className="flex flex-col items-end">
                        <span>Preço médio (BRL)</span>
                        <span className="font-semibold text-zinc-100">
                          {pos.averagePriceBRL
                            ? formatCurrencyBRL(Number(pos.averagePriceBRL))
                            : formatCurrencyBRL(pos.averagePrice)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Coluna direita: Gastos & Parcelas + resumo + notas */}
        <div className="space-y-4">
          <Card
            title="Gastos e Parcelas"
            icon={<TrendingUp className="h-4 w-4 text-rose-400" />}
          >
            <div className="space-y-3">
              <div>
                <p className="text-xs font-medium uppercase text-zinc-400">
                  Gastos no período
                </p>
                <p className="text-2xl font-semibold text-zinc-50">
                  {formatCurrencyBRL(expenses.total)}
                </p>
              </div>

              <div className="h-px w-full bg-zinc-800" />

              <div>
                <div className="mb-2 flex items-center justify-between text-sm">
                  <div className="flex items-center gap-1 text-emerald-400">
                    <CheckCircle2 className="h-4 w-4" />
                    <span>
                      {installments.countPaid} pagas (
                      {formatCurrencyBRL(installments.totalPaid)})
                    </span>
                  </div>
                </div>

                <div className="mb-3 flex items-center justify-between text-sm">
                  <div className="flex items-center gap-1 text-amber-300">
                    <Clock4 className="h-4 w-4" />
                    <span>
                      {installments.countPending} pendentes (
                      {formatCurrencyBRL(installments.totalPending)})
                    </span>
                  </div>
                </div>

                <ProgressBar
                  value={paidPercent}
                  labelLeft="Progresso de pagamento"
                  labelRight={`${paidPercent.toFixed(0)}%`}
                />

                <p className="mt-3 text-[11px] text-zinc-500">
                  {formatDateRangeWithTilde(period.from, period.to)} —{" "}
                  {operationTypeLabel}
                </p>
              </div>
            </div>
          </Card>

          <Card title="Resumo das Parcelas">
            <ul className="space-y-2 text-sm text-zinc-300">
              <li>
                • Você já pagou{" "}
                <span className="font-semibold text-emerald-400">
                  {formatCurrencyBRL(installments.totalPaid)}
                </span>{" "}
                em parcelas neste período.
              </li>
              <li>
                • Ainda restam{" "}
                <span className="font-semibold text-amber-300">
                  {formatCurrencyBRL(installments.totalPending)}
                </span>{" "}
                em{" "}
                <span className="font-semibold">
                  {installments.countPending} parcela
                  {installments.countPending !== 1 && "s"}
                </span>{" "}
                pendente(s).
              </li>
              <li>
                • Seu progresso atual é de{" "}
                <span className="font-semibold text-emerald-400">
                  {paidPercent.toFixed(1)}%
                </span>{" "}
                do total de parcelas.
              </li>
            </ul>
          </Card>

          <Card title="Notas rápidas">
            <p className="text-sm text-zinc-400">
              Ideias para evoluir esse painel:
            </p>
            <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-zinc-300">
              <li>Alertas de parcelas próximas do vencimento.</li>
              <li>Histórico de crescimento do patrimônio mês a mês.</li>
              <li>Gráficos de pizza/linha para gastos por categoria.</li>
            </ul>
          </Card>
        </div>
      </section>

      {/* ===== MODAL: Nova transação ===== */}
      {showTransactionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="w-full max-w-md rounded-2xl bg-zinc-900 p-4 shadow-xl">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-zinc-100">
                Nova transação
              </h2>
              <button
                type="button"
                onClick={() => setShowTransactionModal(false)}
                className="text-xs text-zinc-400 hover:text-zinc-200"
              >
                Fechar
              </button>
            </div>

            <form
              className="mt-3 space-y-3 text-xs text-zinc-100"
              onSubmit={handleSubmitTransaction}
            >
              <div>
                <label className="block text-[11px] text-zinc-400">
                  Título
                </label>
                <input
                  type="text"
                  value={transactionForm.title}
                  onChange={(e) =>
                    setTransactionForm((f) => ({
                      ...f,
                      title: e.target.value,
                    }))
                  }
                  className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-950 px-2 py-1 text-xs outline-none focus:border-emerald-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-zinc-400">
                    Valor
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={transactionForm.amount}
                    onChange={(e) =>
                      setTransactionForm((f) => ({
                        ...f,
                        amount: e.target.value,
                      }))
                    }
                    className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-950 px-2 py-1 text-xs outline-none focus:border-emerald-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-zinc-400">
                    Tipo
                  </label>
                  <select
                    value={transactionForm.type}
                    onChange={(e) =>
                      setTransactionForm((f) => ({
                        ...f,
                        type: e.target.value as "income" | "expense",
                      }))
                    }
                    className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-950 px-2 py-1 text-xs outline-none focus:border-emerald-500"
                  >
                    <option value="income">Receita</option>
                    <option value="expense">Despesa</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] text-zinc-400">
                  Data / hora
                </label>
                <input
                  type="datetime-local"
                  value={transactionForm.date}
                  onChange={(e) =>
                    setTransactionForm((f) => ({
                      ...f,
                      date: e.target.value,
                    }))
                  }
                  className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-950 px-2 py-1 text-xs outline-none focus:border-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] text-zinc-400">
                  Categoria
                </label>
                <select
                  value={transactionForm.categoryId}
                  onChange={(e) =>
                    setTransactionForm((f) => ({
                      ...f,
                      categoryId: e.target.value,
                    }))
                  }
                  disabled={loadingCategories || categories.length === 0}
                  className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-950 px-2 py-1 text-xs outline-none focus:border-emerald-500 disabled:opacity-60"
                  required
                >
                  <option value="">
                    {loadingCategories
                      ? "Carregando categorias..."
                      : categories.length === 0
                      ? "Nenhuma categoria disponível"
                      : "Selecione uma categoria"}
                  </option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] text-zinc-400">
                  Notas (opcional)
                </label>
                <textarea
                  value={transactionForm.notes}
                  onChange={(e) =>
                    setTransactionForm((f) => ({
                      ...f,
                      notes: e.target.value,
                    }))
                  }
                  className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-950 px-2 py-1 text-xs outline-none focus:border-emerald-500"
                  rows={2}
                />
              </div>

              <div className="mt-4 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowTransactionModal(false)}
                  className="rounded-md border border-zinc-700 px-3 py-1 text-xs text-zinc-200 hover:border-zinc-500"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={creatingTransaction}
                  className="rounded-md bg-emerald-600 px-3 py-1 text-xs font-semibold text-emerald-50 hover:bg-emerald-500 disabled:opacity-60"
                >
                  {creatingTransaction ? "Salvando..." : "Salvar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===== MODAL: Despesa (recorrente ou única) ===== */}
      {showExpenseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="w-full max-w-md rounded-2xl bg-zinc-900 p-4 shadow-xl">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-zinc-100">
                Nova despesa
              </h2>
              <button
                type="button"
                onClick={() => setShowExpenseModal(false)}
                className="text-xs text-zinc-400 hover:text-zinc-200"
              >
                Fechar
              </button>
            </div>

            <form
              className="mt-3 space-y-3 text-xs text-zinc-100"
              onSubmit={handleSubmitExpense}
            >
              <div>
                <label className="block text-[11px] text-zinc-400">
                  Título
                </label>
                <input
                  type="text"
                  value={expenseForm.title}
                  onChange={(e) =>
                    setExpenseForm((f) => ({ ...f, title: e.target.value }))
                  }
                  className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-950 px-2 py-1 text-xs outline-none focus:border-emerald-500"
                  required
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] text-zinc-400">
                    Valor total
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={expenseForm.totalAmount}
                    onChange={(e) =>
                      setExpenseForm((f) => ({
                        ...f,
                        totalAmount: e.target.value,
                      }))
                    }
                    className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-950 px-2 py-1 text-xs outline-none focus:border-emerald-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-zinc-400">
                    Parcelas
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={expenseForm.installments}
                    onChange={(e) =>
                      setExpenseForm((f) => ({
                        ...f,
                        installments: e.target.value,
                      }))
                    }
                    className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-950 px-2 py-1 text-xs outline-none focus:border-emerald-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-zinc-400">
                    Tipo
                  </label>
                  <select
                    value={expenseForm.operationType}
                    onChange={(e) =>
                      setExpenseForm((f) => ({
                        ...f,
                        operationType: e.target.value as "recurring" | "purchase",
                      }))
                    }
                    className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-950 px-2 py-1 text-xs outline-none focus:border-emerald-500"
                  >
                    <option value="recurring">Recorrente</option>
                    <option value="purchase">Compra única</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] text-zinc-400">
                  Data / hora inicial
                </label>
                <input
                  type="datetime-local"
                  value={expenseForm.date}
                  onChange={(e) =>
                    setExpenseForm((f) => ({ ...f, date: e.target.value }))
                  }
                  className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-950 px-2 py-1 text-xs outline-none focus:border-emerald-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-zinc-400">
                    Tipo de pagamento
                  </label>
                  <select
                    value={expenseForm.paymentType}
                    onChange={(e) =>
                      setExpenseForm((f) => ({
                        ...f,
                        paymentType: e.target.value as "credit_card" | "pix",
                      }))
                    }
                    className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-950 px-2 py-1 text-xs outline-none focus:border-emerald-500"
                  >
                    <option value="credit_card">Cartão de crédito</option>
                    <option value="pix">Pix</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] text-zinc-400">
                    Categoria
                  </label>
                  <select
                    value={expenseForm.categoryId}
                    onChange={(e) =>
                      setExpenseForm((f) => ({
                        ...f,
                        categoryId: e.target.value,
                      }))
                    }
                    disabled={loadingCategories || categories.length === 0}
                    className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-950 px-2 py-1 text-xs outline-none focus:border-emerald-500 disabled:opacity-60"
                    required
                  >
                    <option value="">
                      {loadingCategories
                        ? "Carregando categorias..."
                        : categories.length === 0
                        ? "Nenhuma categoria disponível"
                        : "Selecione uma categoria"}
                    </option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] text-zinc-400">
                  Notas (opcional)
                </label>
                <textarea
                  value={expenseForm.notes}
                  onChange={(e) =>
                    setExpenseForm((f) => ({ ...f, notes: e.target.value }))
                  }
                  className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-950 px-2 py-1 text-xs outline-none focus:border-emerald-500"
                  rows={2}
                />
              </div>

              <div className="mt-4 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowExpenseModal(false)}
                  className="rounded-md border border-zinc-700 px-3 py-1 text-xs text-zinc-200 hover:border-zinc-500"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={creatingExpense}
                  className="rounded-md bg-emerald-600 px-3 py-1 text-xs font-semibold text-emerald-50 hover:bg-emerald-500 disabled:opacity-60"
                >
                  {creatingExpense ? "Salvando..." : "Salvar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===== MODAL: Novo investimento ===== */}
      {showInvestmentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="w-full max-w-md rounded-2xl bg-zinc-900 p-4 shadow-xl">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-zinc-100">
                Novo investimento
              </h2>
              <button
                type="button"
                onClick={() => setShowInvestmentModal(false)}
                className="text-xs text-zinc-400 hover:text-zinc-200"
              >
                Fechar
              </button>
            </div>

            <form
              className="mt-3 space-y-3 text-xs text-zinc-100"
              onSubmit={handleSubmitInvestment}
            >
              <div>
                <label className="block text-[11px] text-zinc-400">
                  Ativo
                </label>
                <select
                  value={investmentForm.assetId}
                  onChange={(e) =>
                    setInvestmentForm((f) => ({
                      ...f,
                      assetId: e.target.value,
                    }))
                  }
                  disabled={loadingAssets || assets.length === 0}
                  className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-950 px-2 py-1 text-xs outline-none focus:border-emerald-500 disabled:opacity-60"
                  required
                >
                  <option value="">
                    {loadingAssets
                      ? "Carregando ativos..."
                      : assets.length === 0
                      ? "Nenhum ativo disponível"
                      : "Selecione um ativo"}
                  </option>
                  {assets.map((asset) => (
                    <option key={asset.id} value={asset.id}>
                      {asset.name.toUpperCase()} ({asset.type})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-zinc-400">
                    Operação
                  </label>
                  <select
                    value={investmentForm.operationType}
                    onChange={(e) =>
                      setInvestmentForm((f) => ({
                        ...f,
                        operationType: e.target.value as "buy" | "sell",
                      }))
                    }
                    className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-950 px-2 py-1 text-xs outline-none focus:border-emerald-500"
                  >
                    <option value="buy">Compra</option>
                    <option value="sell">Venda</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] text-zinc-400">
                    Data / hora
                  </label>
                  <input
                    type="datetime-local"
                    value={investmentForm.date}
                    onChange={(e) =>
                      setInvestmentForm((f) => ({
                        ...f,
                        date: e.target.value,
                      }))
                    }
                    className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-950 px-2 py-1 text-xs outline-none focus:border-emerald-500"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] text-zinc-400">
                    Quantidade
                  </label>
                  <input
                    type="number"
                    step="0.00000001"
                    value={investmentForm.amount}
                    onChange={(e) =>
                      setInvestmentForm((f) => ({
                        ...f,
                        amount: e.target.value,
                      }))
                    }
                    className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-950 px-2 py-1 text-xs outline-none focus:border-emerald-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-zinc-400">
                    Preço
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={investmentForm.price}
                    onChange={(e) =>
                      setInvestmentForm((f) => ({
                        ...f,
                        price: e.target.value,
                      }))
                    }
                    className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-950 px-2 py-1 text-xs outline-none focus:border-emerald-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-zinc-400">
                    Total
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={investmentForm.total}
                    onChange={(e) =>
                      setInvestmentForm((f) => ({
                        ...f,
                        total: e.target.value,
                      }))
                    }
                    className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-950 px-2 py-1 text-xs outline-none focus:border-emerald-500"
                    required
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  id="isCashMovement"
                  type="checkbox"
                  checked={investmentForm.isCashMovement}
                  onChange={(e) =>
                    setInvestmentForm((f) => ({
                      ...f,
                      isCashMovement: e.target.checked,
                    }))
                  }
                  className="h-3 w-3 rounded border-zinc-700 bg-zinc-950 text-emerald-500"
                />
                <label
                  htmlFor="isCashMovement"
                  className="text-[11px] text-zinc-400"
                >
                  Movimenta caixa (entrada/saída de dinheiro)
                </label>
              </div>

              <div>
                <label className="block text-[11px] text-zinc-400">
                  Notas (opcional)
                </label>
                <textarea
                  value={investmentForm.notes}
                  onChange={(e) =>
                    setInvestmentForm((f) => ({
                      ...f,
                      notes: e.target.value,
                    }))
                  }
                  className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-950 px-2 py-1 text-xs outline-none focus:border-emerald-500"
                  rows={2}
                />
              </div>

              <div className="mt-4 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowInvestmentModal(false)}
                  className="rounded-md border border-zinc-700 px-3 py-1 text-xs text-zinc-200 hover:border-zinc-500"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={creatingInvestment}
                  className="rounded-md bg-emerald-600 px-3 py-1 text-xs font-semibold text-emerald-50 hover:bg-emerald-500 disabled:opacity-60"
                >
                  {creatingInvestment ? "Salvando..." : "Salvar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}


// import React from "react";
// import { useSession } from "../lib/useSession";
// import {
//   Wallet,
//   BarChart2,
//   CalendarRange,
//   TrendingUp,
//   CheckCircle2,
//   Clock4,
// } from "lucide-react";
// import type { OperationType } from "../features/health-hub/types";
// import {
//   formatCurrencyBRL,
//   formatDateRangeWithTilde,
//   percent,
//   toInputDate,
//   WEALTH_RANGE_STORAGE_KEY,
// } from "../features/health-hub/utils";
// import { useWealthOverview } from "../features/health-hub/hooks";
// import { Card, ProgressBar } from "../components/health-hub/Card";
// import { api } from "../lib/http";

// // helper pra converter datetime-local em ISO
// function toISO(dateTime: string) {
//   if (!dateTime) return "";
//   return new Date(dateTime).toISOString();
// }

// export default function WealthHubPage() {
//   const { data: session, isLoading: loadingSession } = useSession();
//   const userId = session?.user?.id ?? "";

//   // ===== Filtro de datas (range) =====
//   const year = React.useMemo(() => new Date().getFullYear(), []);
//   const yearStart = React.useMemo(() => new Date(year, 0, 1), [year]);
//   const yearEnd = React.useMemo(() => new Date(year, 11, 31), [year]);

//   // valores "aplicados" (usados na API)
//   const [from, setFrom] = React.useState<string>("");
//   const [to, setTo] = React.useState<string>("");

//   // valores que o usuário está digitando no input
//   const [fromInput, setFromInput] = React.useState<string>("");
//   const [toInputValue, setToInputValue] = React.useState<string>("");

//   // filtro de tipo de operação
//   const [operationType, setOperationType] =
//     React.useState<OperationType | undefined>(undefined);

//   // ===== MODAIS (abertos/fechados) =====
//   const [showTransactionModal, setShowTransactionModal] = React.useState(false);
//   const [showExpenseModal, setShowExpenseModal] = React.useState(false);
//   const [showInvestmentModal, setShowInvestmentModal] = React.useState(false);

//   // ===== FORM: transação =====
//   const [transactionForm, setTransactionForm] = React.useState({
//     title: "",
//     amount: "",
//     type: "income" as "income" | "expense",
//     date: "",
//     notes: "",
//     categoryId: "",
//   });
//   const [creatingTransaction, setCreatingTransaction] = React.useState(false);

//   async function handleSubmitTransaction(e: React.FormEvent) {
//     e.preventDefault();
//     if (!userId) return;

//     try {
//       setCreatingTransaction(true);

//       await api("/transactions/create", {
//         method: "POST",
//         body: JSON.stringify({
//           title: transactionForm.title,
//           amount: transactionForm.amount, // conforme seu exemplo (string)
//           type: transactionForm.type,
//           date: toISO(transactionForm.date),
//           notes: transactionForm.notes || undefined,
//           categoryId: transactionForm.categoryId,
//           userId,
//         }),
//       });

//       console.log("[WealthHub] Transação criada com sucesso");
//       setShowTransactionModal(false);
//       setTransactionForm({
//         title: "",
//         amount: "",
//         type: "income",
//         date: "",
//         notes: "",
//         categoryId: "",
//       });

//       // TODO: recarregar overview (ex: invalidateQueries / refetch)
//     } catch (err) {
//       console.error("[WealthHub] Erro ao criar transação", err);
//       alert("Erro ao criar transação. Verifique os dados e tente novamente.");
//     } finally {
//       setCreatingTransaction(false);
//     }
//   }

//   // ===== FORM: despesa recorrente =====
//   const [expenseForm, setExpenseForm] = React.useState({
//     title: "",
//     totalAmount: "",
//     installments: "1",
//     date: "",
//     notes: "",
//     categoryId: "",
//     operationType: "recurring" as "recurring" | "purchase",
//     paymentType: "credit_card" as "credit_card" | "pix",
//   });
//   const [creatingExpense, setCreatingExpense] = React.useState(false);

//   async function handleSubmitExpense(e: React.FormEvent) {
//     e.preventDefault();
//     if (!userId) return;

//     try {
//       setCreatingExpense(true);

//       await api("/expenses/create", {
//         method: "POST",
//         body: JSON.stringify({
//           title: expenseForm.title,
//           totalAmount: Number(expenseForm.totalAmount),
//           installments: Number(expenseForm.installments),
//           date: toISO(expenseForm.date),
//           notes: expenseForm.notes || undefined,
//           categoryId: expenseForm.categoryId,
//           userId,
//           operationType: expenseForm.operationType,
//           paymentType: expenseForm.paymentType,
//         }),
//       });

//       console.log("[WealthHub] Despesa criada com sucesso");
//       setShowExpenseModal(false);
//       setExpenseForm({
//         title: "",
//         totalAmount: "",
//         installments: "1",
//         date: "",
//         notes: "",
//         categoryId: "",
//         operationType: "recurring",
//         paymentType: "credit_card",
//       });

//       // TODO: recarregar overview
//     } catch (err) {
//       console.error("[WealthHub] Erro ao criar despesa", err);
//       alert("Erro ao criar despesa. Verifique os dados e tente novamente.");
//     } finally {
//       setCreatingExpense(false);
//     }
//   }

//   // ===== FORM: investimento =====
//   const [investmentForm, setInvestmentForm] = React.useState({
//     assetId: "",
//     date: "",
//     operationType: "buy" as "buy" | "sell",
//     amount: "",
//     price: "",
//     total: "",
//     isCashMovement: true,
//     notes: "",
//   });
//   const [creatingInvestment, setCreatingInvestment] = React.useState(false);

//   async function handleSubmitInvestment(e: React.FormEvent) {
//     e.preventDefault();
//     if (!userId) return;

//     try {
//       setCreatingInvestment(true);

//       await api("/investment-transactions/create", {
//         method: "POST",
//         body: JSON.stringify({
//           userId,
//           assetId: investmentForm.assetId,
//           date: toISO(investmentForm.date),
//           operationType: investmentForm.operationType,
//           amount: Number(investmentForm.amount),
//           price: Number(investmentForm.price),
//           total: Number(investmentForm.total),
//           isCashMovement: investmentForm.isCashMovement,
//           notes: investmentForm.notes || undefined,
//         }),
//       });

//       console.log("[WealthHub] Investimento criado com sucesso");
//       setShowInvestmentModal(false);
//       setInvestmentForm({
//         assetId: "",
//         date: "",
//         operationType: "buy",
//         amount: "",
//         price: "",
//         total: "",
//         isCashMovement: true,
//         notes: "",
//       });

//       // TODO: recarregar overview
//     } catch (err) {
//       console.error("[WealthHub] Erro ao criar investimento", err);
//       alert("Erro ao criar investimento. Verifique os dados e tente novamente.");
//     } finally {
//       setCreatingInvestment(false);
//     }
//   }

//   // carrega range inicial do localStorage (ou ano vigente)
//   React.useEffect(() => {
//     if (!userId) return;

//     const key = WEALTH_RANGE_STORAGE_KEY(userId);
//     let initialFrom = "";
//     let initialTo = "";

//     if (typeof window !== "undefined") {
//       const raw = window.localStorage.getItem(key);
//       if (raw) {
//         try {
//           const parsed = JSON.parse(raw) as { from?: string; to?: string };
//           if (parsed.from && parsed.to) {
//             initialFrom = parsed.from;
//             initialTo = parsed.to;
//           } else {
//             window.localStorage.removeItem(key);
//           }
//         } catch {
//           window.localStorage.removeItem(key);
//         }
//       }
//     }

//     // se não tinha nada salvo, usa ano vigente
//     if (!initialFrom || !initialTo) {
//       initialFrom = toInputDate(yearStart);
//       initialTo = toInputDate(yearEnd);
//     }

//     setFrom(initialFrom);
//     setTo(initialTo);
//     setFromInput(initialFrom);
//     setToInputValue(initialTo);
//   }, [userId, yearStart, yearEnd]);

//   // persiste sempre que o range aplicado muda
//   React.useEffect(() => {
//     if (!userId || !from || !to) return;
//     if (typeof window === "undefined") return;

//     const key = WEALTH_RANGE_STORAGE_KEY(userId);
//     window.localStorage.setItem(key, JSON.stringify({ from, to }));
//   }, [userId, from, to]);

//   const { data, loading, error, lastUpdated } = useWealthOverview(
//     userId,
//     from,
//     to,
//     operationType
//   );

//   function applyDateRange() {
//     if (!fromInput || !toInputValue) return;

//     console.log("[WealthHub] Aplicar filtro", {
//       fromInput,
//       toInputValue,
//       operationType,
//     });

//     setFrom(fromInput);
//     setTo(toInputValue);
//   }

//   console.log("[WealthHub] Render", {
//     userId,
//     from,
//     to,
//     operationType,
//     hasData: !!data,
//   });

//   if (loadingSession) {
//     return <div className="p-6 text-zinc-200">Carregando sessão…</div>;
//   }

//   if (!userId) {
//     return <div className="p-6 text-zinc-200">Você precisa entrar.</div>;
//   }

//   if (error) {
//     return (
//       <div className="space-y-3 p-6 text-zinc-200">
//         <p className="text-sm text-red-400">
//           Ocorreu um erro ao carregar o Wealth Hub:
//         </p>
//         <pre className="whitespace-pre-wrap rounded-xl bg-zinc-900 p-3 text-xs text-zinc-300">
//           {error}
//         </pre>
//       </div>
//     );
//   }

//   if (loading && !data) {
//     return <div className="p-6 text-zinc-200">Carregando Wealth Hub…</div>;
//   }

//   if (!data) {
//     return (
//       <div className="p-6 text-zinc-200">
//         Nenhum dado retornado para esse período.
//       </div>
//     );
//   }

//   const { positions, period, expenses, installments, rates } = data;

//   const totalInvested = positions.reduce((acc, p) => acc + p.invested, 0);
//   const totalInstallments = installments.totalPaid + installments.totalPending;
//   const paidPercent = percent(installments.totalPaid, totalInstallments);

//   const operationTypeLabel =
//     operationType === "purchase"
//       ? "Compras únicas"
//       : operationType === "recurring"
//       ? "Recorrentes"
//       : "Todas as operações";

//   return (
//     <div className="space-y-5">
//       {/* Header + barra de filtro usando largura toda */}
//       <header className="space-y-4">
//         <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
//           <div>
//             <h1 className="flex items-center gap-2 text-2xl font-bold text-zinc-50">
//               <Wallet className="h-6 w-6 text-emerald-400" />
//               Wealth Hub
//             </h1>
//             <p className="mt-1 text-sm text-zinc-400">
//               Visão consolidada do seu patrimônio, gastos e parcelas.
//             </p>

//             {rates && (
//               <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-zinc-500">
//                 <span>
//                   BTC/USD:&nbsp;
//                   <span className="font-mono text-zinc-200">
//                     {new Intl.NumberFormat("en-US", {
//                       style: "currency",
//                       currency: "USD",
//                       maximumFractionDigits: 0,
//                     }).format(rates.btc_usd)}
//                   </span>
//                 </span>
//                 <span>
//                   BTC/BRL:&nbsp;
//                   <span className="font-mono text-zinc-200">
//                     {formatCurrencyBRL(rates.btc_brl)}
//                   </span>
//                 </span>
//                 <span>
//                   USD/BRL:&nbsp;
//                   <span className="font-mono text-zinc-200">
//                     {rates.usd_brl.toFixed(3)}
//                   </span>
//                 </span>
//                 {lastUpdated && (
//                   <span className="text-[10px] text-zinc-500">
//                     Atualizado em{" "}
//                     {new Date(lastUpdated).toLocaleTimeString("pt-BR")}
//                   </span>
//                 )}
//               </div>
//             )}
//           </div>

//           {/* AÇÕES RÁPIDAS */}
//           <div className="flex flex-wrap gap-2">
//             <button
//               type="button"
//               onClick={() => setShowTransactionModal(true)}
//               className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-emerald-50 shadow-sm hover:bg-emerald-500 active:scale-[0.98]"
//             >
//               Nova transação
//             </button>
//             <button
//               type="button"
//               onClick={() => setShowExpenseModal(true)}
//               className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-zinc-100 hover:border-emerald-500 hover:text-emerald-300 active:scale-[0.98]"
//             >
//               Despesa recorrente
//             </button>
//             <button
//               type="button"
//               onClick={() => setShowInvestmentModal(true)}
//               className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-zinc-100 hover:border-emerald-500 hover:text-emerald-300 active:scale-[0.98]"
//             >
//               Novo investimento
//             </button>
//           </div>
//         </div>

//         {/* Barra de filtros larga */}
//         <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-zinc-800 bg-zinc-900/60 px-4 py-3 text-xs text-zinc-300 sm:text-sm">
//           <div className="flex items-center gap-2">
//             <CalendarRange className="h-4 w-4 text-zinc-400" />
//             <span className="font-medium text-zinc-200">Período</span>
//           </div>

//           <div className="flex flex-wrap items-center gap-2">
//             <label className="flex items-center gap-1">
//               <span className="text-zinc-400">De</span>
//               <input
//                 type="date"
//                 value={fromInput}
//                 onChange={(e) => setFromInput(e.target.value)}
//                 className="rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs text-zinc-100 outline-none focus:border-emerald-500"
//               />
//             </label>
//             <span className="text-zinc-500">→</span>
//             <label className="flex items-center gap-1">
//               <span className="text-zinc-400">Até</span>
//               <input
//                 type="date"
//                 value={toInputValue}
//                 onChange={(e) => setToInputValue(e.target.value)}
//                 className="rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs text-zinc-100 outline-none focus:border-emerald-500"
//               />
//             </label>

//             <button
//               type="button"
//               onClick={applyDateRange}
//               className="rounded-md border border-emerald-500 px-3 py-1 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/10 active:scale-[0.98]"
//             >
//               Aplicar
//             </button>
//           </div>

//           <div className="ml-auto flex items-center gap-2">
//             <span className="text-[10px] font-medium uppercase tracking-wide text-zinc-400">
//               Tipo de operação
//             </span>
//             <select
//               value={operationType ?? ""} // "" representa "sem filtro"
//               onChange={(e) => {
//                 const value = e.target.value as OperationType | "";
//                 setOperationType(value || undefined); // "" -> undefined (não manda)
//               }}
//               className="rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs text-zinc-100 outline-none focus:border-emerald-500"
//             >
//               <option value="">Todas</option>
//               <option value="purchase">Compras únicas</option>
//               <option value="recurring">Recorrentes</option>
//             </select>
//           </div>
//         </div>
//       </header>

//       {/* Grid principal: usa melhor a tela */}
//       <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
//         {/* Coluna esquerda: Total investido + Posições */}
//         <div className="space-y-4">
//           <Card
//             title="Total Investido"
//             icon={<BarChart2 className="h-4 w-4 text-emerald-400" />}
//           >
//             <p className="text-2xl font-semibold text-zinc-50">
//               {formatCurrencyBRL(totalInvested)}
//             </p>
//             <p className="mt-1 text-xs text-zinc-400">
//               Somando todos os ativos cadastrados.
//             </p>
//           </Card>

//           <Card
//             title="Posições"
//             icon={<BarChart2 className="h-4 w-4 text-zinc-300" />}
//           >
//             {positions.length === 0 ? (
//               <p className="text-sm text-zinc-400">
//                 Nenhum ativo cadastrado ainda.
//               </p>
//             ) : (
//               <div className="space-y-3">
//                 {positions.map((pos) => (
//                   <div
//                     key={pos.assetId}
//                     className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-3"
//                   >
//                     <div className="flex items-baseline justify-between gap-2">
//                       <div>
//                         <p className="text-xs font-semibold uppercase text-zinc-200">
//                           {pos.name}
//                         </p>
//                         <p className="text-[11px] text-zinc-500">
//                           {pos.type === "crypto" ? "Cripto" : pos.type}
//                         </p>
//                       </div>
//                       <p className="text-xs text-zinc-300">
//                         Qtde:{" "}
//                         <span className="font-mono">{pos.quantity}</span>
//                       </p>
//                     </div>

//                     <div className="mt-2 grid grid-cols-2 gap-2 text-[11px] text-zinc-400">
//                       <div className="flex flex-col">
//                         <span>Investido</span>
//                         <span className="font-semibold text-zinc-100">
//                           {formatCurrencyBRL(pos.invested)}
//                         </span>
//                       </div>
//                       <div className="flex flex-col items-end">
//                         <span>Preço médio (BRL)</span>
//                         <span className="font-semibold text-zinc-100">
//                           {pos.averagePriceBRL
//                             ? formatCurrencyBRL(Number(pos.averagePriceBRL))
//                             : formatCurrencyBRL(pos.averagePrice)}
//                         </span>
//                       </div>
//                     </div>
//                   </div>
//                 ))}
//               </div>
//             )}
//           </Card>
//         </div>

//         {/* Coluna direita: Gastos & Parcelas + resumo + notas */}
//         <div className="space-y-4">
//           <Card
//             title="Gastos e Parcelas"
//             icon={<TrendingUp className="h-4 w-4 text-rose-400" />}
//           >
//             <div className="space-y-3">
//               <div>
//                 <p className="text-xs font-medium uppercase text-zinc-400">
//                   Gastos no período
//                 </p>
//                 <p className="text-2xl font-semibold text-zinc-50">
//                   {formatCurrencyBRL(expenses.total)}
//                 </p>
//               </div>

//               <div className="h-px w-full bg-zinc-800" />

//               <div>
//                 <div className="mb-2 flex items-center justify-between text-sm">
//                   <div className="flex items-center gap-1 text-emerald-400">
//                     <CheckCircle2 className="h-4 w-4" />
//                     <span>
//                       {installments.countPaid} pagas (
//                       {formatCurrencyBRL(installments.totalPaid)})
//                     </span>
//                   </div>
//                 </div>

//                 <div className="mb-3 flex items-center justify-between text-sm">
//                   <div className="flex items-center gap-1 text-amber-300">
//                     <Clock4 className="h-4 w-4" />
//                     <span>
//                       {installments.countPending} pendentes (
//                       {formatCurrencyBRL(installments.totalPending)})
//                     </span>
//                   </div>
//                 </div>

//                 <ProgressBar
//                   value={paidPercent}
//                   labelLeft="Progresso de pagamento"
//                   labelRight={`${paidPercent.toFixed(0)}%`}
//                 />

//                 <p className="mt-3 text-[11px] text-zinc-500">
//                   {formatDateRangeWithTilde(period.from, period.to)} —{" "}
//                   {operationTypeLabel}
//                 </p>
//               </div>
//             </div>
//           </Card>

//           <Card title="Resumo das Parcelas">
//             <ul className="space-y-2 text-sm text-zinc-300">
//               <li>
//                 • Você já pagou{" "}
//                 <span className="font-semibold text-emerald-400">
//                   {formatCurrencyBRL(installments.totalPaid)}
//                 </span>{" "}
//                 em parcelas neste período.
//               </li>
//               <li>
//                 • Ainda restam{" "}
//                 <span className="font-semibold text-amber-300">
//                   {formatCurrencyBRL(installments.totalPending)}
//                 </span>{" "}
//                 em{" "}
//                 <span className="font-semibold">
//                   {installments.countPending} parcela
//                   {installments.countPending !== 1 && "s"}
//                 </span>{" "}
//                 pendente(s).
//               </li>
//               <li>
//                 • Seu progresso atual é de{" "}
//                 <span className="font-semibold text-emerald-400">
//                   {paidPercent.toFixed(1)}%
//                 </span>{" "}
//                 do total de parcelas.
//               </li>
//             </ul>
//           </Card>

//           <Card title="Notas rápidas">
//             <p className="text-sm text-zinc-400">
//               Ideias para evoluir esse painel:
//             </p>
//             <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-zinc-300">
//               <li>Alertas de parcelas próximas do vencimento.</li>
//               <li>Histórico de crescimento do patrimônio mês a mês.</li>
//               <li>Gráficos de pizza/linha para gastos por categoria.</li>
//             </ul>
//           </Card>
//         </div>
//       </section>

//       {/* ===== MODAL: Nova transação ===== */}
//       {showTransactionModal && (
//         <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
//           <div className="w-full max-w-md rounded-2xl bg-zinc-900 p-4 shadow-xl">
//             <div className="flex items-center justify-between">
//               <h2 className="text-sm font-semibold text-zinc-100">
//                 Nova transação
//               </h2>
//               <button
//                 type="button"
//                 onClick={() => setShowTransactionModal(false)}
//                 className="text-xs text-zinc-400 hover:text-zinc-200"
//               >
//                 Fechar
//               </button>
//             </div>

//             <form
//               className="mt-3 space-y-3 text-xs text-zinc-100"
//               onSubmit={handleSubmitTransaction}
//             >
//               <div>
//                 <label className="block text-[11px] text-zinc-400">
//                   Título
//                 </label>
//                 <input
//                   type="text"
//                   value={transactionForm.title}
//                   onChange={(e) =>
//                     setTransactionForm((f) => ({
//                       ...f,
//                       title: e.target.value,
//                     }))
//                   }
//                   className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-950 px-2 py-1 text-xs outline-none focus:border-emerald-500"
//                   required
//                 />
//               </div>

//               <div className="grid grid-cols-2 gap-3">
//                 <div>
//                   <label className="block text-[11px] text-zinc-400">
//                     Valor
//                   </label>
//                   <input
//                     type="number"
//                     step="0.01"
//                     value={transactionForm.amount}
//                     onChange={(e) =>
//                       setTransactionForm((f) => ({
//                         ...f,
//                         amount: e.target.value,
//                       }))
//                     }
//                     className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-950 px-2 py-1 text-xs outline-none focus:border-emerald-500"
//                     required
//                   />
//                 </div>
//                 <div>
//                   <label className="block text-[11px] text-zinc-400">
//                     Tipo
//                   </label>
//                   <select
//                     value={transactionForm.type}
//                     onChange={(e) =>
//                       setTransactionForm((f) => ({
//                         ...f,
//                         type: e.target.value as "income" | "expense",
//                       }))
//                     }
//                     className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-950 px-2 py-1 text-xs outline-none focus:border-emerald-500"
//                   >
//                     <option value="income">Receita</option>
//                     <option value="expense">Despesa</option>
//                   </select>
//                 </div>
//               </div>

//               <div>
//                 <label className="block text-[11px] text-zinc-400">
//                   Data / hora
//                 </label>
//                 <input
//                   type="datetime-local"
//                   value={transactionForm.date}
//                   onChange={(e) =>
//                     setTransactionForm((f) => ({
//                       ...f,
//                       date: e.target.value,
//                     }))
//                   }
//                   className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-950 px-2 py-1 text-xs outline-none focus:border-emerald-500"
//                   required
//                 />
//               </div>

//               <div>
//                 <label className="block text-[11px] text-zinc-400">
//                   Categoria (ID)
//                 </label>
//                 <input
//                   type="text"
//                   value={transactionForm.categoryId}
//                   onChange={(e) =>
//                     setTransactionForm((f) => ({
//                       ...f,
//                       categoryId: e.target.value,
//                     }))
//                   }
//                   className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-950 px-2 py-1 text-xs outline-none focus:border-emerald-500"
//                   required
//                 />
//               </div>

//               <div>
//                 <label className="block text-[11px] text-zinc-400">
//                   Notas (opcional)
//                 </label>
//                 <textarea
//                   value={transactionForm.notes}
//                   onChange={(e) =>
//                     setTransactionForm((f) => ({
//                       ...f,
//                       notes: e.target.value,
//                     }))
//                   }
//                   className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-950 px-2 py-1 text-xs outline-none focus:border-emerald-500"
//                   rows={2}
//                 />
//               </div>

//               <div className="mt-4 flex justify-end gap-2">
//                 <button
//                   type="button"
//                   onClick={() => setShowTransactionModal(false)}
//                   className="rounded-md border border-zinc-700 px-3 py-1 text-xs text-zinc-200 hover:border-zinc-500"
//                 >
//                   Cancelar
//                 </button>
//                 <button
//                   type="submit"
//                   disabled={creatingTransaction}
//                   className="rounded-md bg-emerald-600 px-3 py-1 text-xs font-semibold text-emerald-50 hover:bg-emerald-500 disabled:opacity-60"
//                 >
//                   {creatingTransaction ? "Salvando..." : "Salvar"}
//                 </button>
//               </div>
//             </form>
//           </div>
//         </div>
//       )}

//       {/* ===== MODAL: Despesa (recorrente ou única) ===== */}
//       {showExpenseModal && (
//         <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
//           <div className="w-full max-w-md rounded-2xl bg-zinc-900 p-4 shadow-xl">
//             <div className="flex items-center justify-between">
//               <h2 className="text-sm font-semibold text-zinc-100">
//                 Nova despesa
//               </h2>
//               <button
//                 type="button"
//                 onClick={() => setShowExpenseModal(false)}
//                 className="text-xs text-zinc-400 hover:text-zinc-200"
//               >
//                 Fechar
//               </button>
//             </div>

//             <form
//               className="mt-3 space-y-3 text-xs text-zinc-100"
//               onSubmit={handleSubmitExpense}
//             >
//               <div>
//                 <label className="block text-[11px] text-zinc-400">
//                   Título
//                 </label>
//                 <input
//                   type="text"
//                   value={expenseForm.title}
//                   onChange={(e) =>
//                     setExpenseForm((f) => ({ ...f, title: e.target.value }))
//                   }
//                   className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-950 px-2 py-1 text-xs outline-none focus:border-emerald-500"
//                   required
//                 />
//               </div>

//               <div className="grid grid-cols-3 gap-3">
//                 <div>
//                   <label className="block text-[11px] text-zinc-400">
//                     Valor total
//                   </label>
//                   <input
//                     type="number"
//                     step="0.01"
//                     value={expenseForm.totalAmount}
//                     onChange={(e) =>
//                       setExpenseForm((f) => ({
//                         ...f,
//                         totalAmount: e.target.value,
//                       }))
//                     }
//                     className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-950 px-2 py-1 text-xs outline-none focus:border-emerald-500"
//                     required
//                   />
//                 </div>
//                 <div>
//                   <label className="block text-[11px] text-zinc-400">
//                     Parcelas
//                   </label>
//                   <input
//                     type="number"
//                     min={1}
//                     value={expenseForm.installments}
//                     onChange={(e) =>
//                       setExpenseForm((f) => ({
//                         ...f,
//                         installments: e.target.value,
//                       }))
//                     }
//                     className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-950 px-2 py-1 text-xs outline-none focus:border-emerald-500"
//                     required
//                   />
//                 </div>
//                 <div>
//                   <label className="block text-[11px] text-zinc-400">
//                     Tipo
//                   </label>
//                   <select
//                     value={expenseForm.operationType}
//                     onChange={(e) =>
//                       setExpenseForm((f) => ({
//                         ...f,
//                         operationType: e.target.value as "recurring" | "purchase",
//                       }))
//                     }
//                     className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-950 px-2 py-1 text-xs outline-none focus:border-emerald-500"
//                   >
//                     <option value="recurring">Recorrente</option>
//                     <option value="purchase">Compra única</option>
//                   </select>
//                 </div>
//               </div>

//               <div>
//                 <label className="block text-[11px] text-zinc-400">
//                   Data / hora inicial
//                 </label>
//                 <input
//                   type="datetime-local"
//                   value={expenseForm.date}
//                   onChange={(e) =>
//                     setExpenseForm((f) => ({ ...f, date: e.target.value }))
//                   }
//                   className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-950 px-2 py-1 text-xs outline-none focus:border-emerald-500"
//                   required
//                 />
//               </div>

//               <div className="grid grid-cols-2 gap-3">
//                 <div>
//                   <label className="block text-[11px] text-zinc-400">
//                     Tipo de pagamento
//                   </label>
//                   <select
//                     value={expenseForm.paymentType}
//                     onChange={(e) =>
//                       setExpenseForm((f) => ({
//                         ...f,
//                         paymentType: e.target.value as "credit_card" | "pix",
//                       }))
//                     }
//                     className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-950 px-2 py-1 text-xs outline-none focus:border-emerald-500"
//                   >
//                     <option value="credit_card">Cartão de crédito</option>
//                     <option value="pix">Pix</option>
//                   </select>
//                 </div>
//                 <div>
//                   <label className="block text-[11px] text-zinc-400">
//                     Categoria (ID)
//                   </label>
//                   <input
//                     type="text"
//                     value={expenseForm.categoryId}
//                     onChange={(e) =>
//                       setExpenseForm((f) => ({
//                         ...f,
//                         categoryId: e.target.value,
//                       }))
//                     }
//                     className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-950 px-2 py-1 text-xs outline-none focus:border-emerald-500"
//                     required
//                   />
//                 </div>
//               </div>

//               <div>
//                 <label className="block text-[11px] text-zinc-400">
//                   Notas (opcional)
//                 </label>
//                 <textarea
//                   value={expenseForm.notes}
//                   onChange={(e) =>
//                     setExpenseForm((f) => ({ ...f, notes: e.target.value }))
//                   }
//                   className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-950 px-2 py-1 text-xs outline-none focus:border-emerald-500"
//                   rows={2}
//                 />
//               </div>

//               <div className="mt-4 flex justify-end gap-2">
//                 <button
//                   type="button"
//                   onClick={() => setShowExpenseModal(false)}
//                   className="rounded-md border border-zinc-700 px-3 py-1 text-xs text-zinc-200 hover:border-zinc-500"
//                 >
//                   Cancelar
//                 </button>
//                 <button
//                   type="submit"
//                   disabled={creatingExpense}
//                   className="rounded-md bg-emerald-600 px-3 py-1 text-xs font-semibold text-emerald-50 hover:bg-emerald-500 disabled:opacity-60"
//                 >
//                   {creatingExpense ? "Salvando..." : "Salvar"}
//                 </button>
//               </div>
//             </form>
//           </div>
//         </div>
//       )}

//       {/* ===== MODAL: Novo investimento ===== */}
//       {showInvestmentModal && (
//         <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
//           <div className="w-full max-w-md rounded-2xl bg-zinc-900 p-4 shadow-xl">
//             <div className="flex items-center justify-between">
//               <h2 className="text-sm font-semibold text-zinc-100">
//                 Novo investimento
//               </h2>
//               <button
//                 type="button"
//                 onClick={() => setShowInvestmentModal(false)}
//                 className="text-xs text-zinc-400 hover:text-zinc-200"
//               >
//                 Fechar
//               </button>
//             </div>

//             <form
//               className="mt-3 space-y-3 text-xs text-zinc-100"
//               onSubmit={handleSubmitInvestment}
//             >
//               <div>
//                 <label className="block text-[11px] text-zinc-400">
//                   Asset ID
//                 </label>
//                 <input
//                   type="text"
//                   value={investmentForm.assetId}
//                   onChange={(e) =>
//                     setInvestmentForm((f) => ({
//                       ...f,
//                       assetId: e.target.value,
//                     }))
//                   }
//                   className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-950 px-2 py-1 text-xs outline-none focus:border-emerald-500"
//                   required
//                 />
//               </div>

//               <div className="grid grid-cols-2 gap-3">
//                 <div>
//                   <label className="block text-[11px] text-zinc-400">
//                     Operação
//                   </label>
//                   <select
//                     value={investmentForm.operationType}
//                     onChange={(e) =>
//                       setInvestmentForm((f) => ({
//                         ...f,
//                         operationType: e.target.value as "buy" | "sell",
//                       }))
//                     }
//                     className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-950 px-2 py-1 text-xs outline-none focus:border-emerald-500"
//                   >
//                     <option value="buy">Compra</option>
//                     <option value="sell">Venda</option>
//                   </select>
//                 </div>
//                 <div>
//                   <label className="block text-[11px] text-zinc-400">
//                     Data / hora
//                   </label>
//                   <input
//                     type="datetime-local"
//                     value={investmentForm.date}
//                     onChange={(e) =>
//                       setInvestmentForm((f) => ({
//                         ...f,
//                         date: e.target.value,
//                       }))
//                     }
//                     className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-950 px-2 py-1 text-xs outline-none focus:border-emerald-500"
//                     required
//                   />
//                 </div>
//               </div>

//               <div className="grid grid-cols-3 gap-3">
//                 <div>
//                   <label className="block text-[11px] text-zinc-400">
//                     Quantidade
//                   </label>
//                   <input
//                     type="number"
//                     step="0.00000001"
//                     value={investmentForm.amount}
//                     onChange={(e) =>
//                       setInvestmentForm((f) => ({
//                         ...f,
//                         amount: e.target.value,
//                       }))
//                     }
//                     className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-950 px-2 py-1 text-xs outline-none focus:border-emerald-500"
//                     required
//                   />
//                 </div>
//                 <div>
//                   <label className="block text-[11px] text-zinc-400">
//                     Preço
//                   </label>
//                   <input
//                     type="number"
//                     step="0.01"
//                     value={investmentForm.price}
//                     onChange={(e) =>
//                       setInvestmentForm((f) => ({
//                         ...f,
//                         price: e.target.value,
//                       }))
//                     }
//                     className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-950 px-2 py-1 text-xs outline-none focus:border-emerald-500"
//                     required
//                   />
//                 </div>
//                 <div>
//                   <label className="block text-[11px] text-zinc-400">
//                     Total
//                   </label>
//                   <input
//                     type="number"
//                     step="0.01"
//                     value={investmentForm.total}
//                     onChange={(e) =>
//                       setInvestmentForm((f) => ({
//                         ...f,
//                         total: e.target.value,
//                       }))
//                     }
//                     className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-950 px-2 py-1 text-xs outline-none focus:border-emerald-500"
//                     required
//                   />
//                 </div>
//               </div>

//               <div className="flex items-center gap-2">
//                 <input
//                   id="isCashMovement"
//                   type="checkbox"
//                   checked={investmentForm.isCashMovement}
//                   onChange={(e) =>
//                     setInvestmentForm((f) => ({
//                       ...f,
//                       isCashMovement: e.target.checked,
//                     }))
//                   }
//                   className="h-3 w-3 rounded border-zinc-700 bg-zinc-950 text-emerald-500"
//                 />
//                 <label
//                   htmlFor="isCashMovement"
//                   className="text-[11px] text-zinc-400"
//                 >
//                   Movimenta caixa (entrada/saída de dinheiro)
//                 </label>
//               </div>

//               <div>
//                 <label className="block text-[11px] text-zinc-400">
//                   Notas (opcional)
//                 </label>
//                 <textarea
//                   value={investmentForm.notes}
//                   onChange={(e) =>
//                     setInvestmentForm((f) => ({
//                       ...f,
//                       notes: e.target.value,
//                     }))
//                   }
//                   className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-950 px-2 py-1 text-xs outline-none focus:border-emerald-500"
//                   rows={2}
//                 />
//               </div>

//               <div className="mt-4 flex justify-end gap-2">
//                 <button
//                   type="button"
//                   onClick={() => setShowInvestmentModal(false)}
//                   className="rounded-md border border-zinc-700 px-3 py-1 text-xs text-zinc-200 hover:border-zinc-500"
//                 >
//                   Cancelar
//                 </button>
//                 <button
//                   type="submit"
//                   disabled={creatingInvestment}
//                   className="rounded-md bg-emerald-600 px-3 py-1 text-xs font-semibold text-emerald-50 hover:bg-emerald-500 disabled:opacity-60"
//                 >
//                   {creatingInvestment ? "Salvando..." : "Salvar"}
//                 </button>
//               </div>
//             </form>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// }
