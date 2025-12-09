import React from "react";
import { useSession } from "../lib/useSession";
import { api } from "../lib/http";
import {
  Wallet,
  Repeat2,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Circle,
  Plus,
  CalendarRange,
  Clock4,
  Shuffle,
} from "lucide-react";
import {
  formatCurrencyBRL,
  formatDateRangeWithTilde,
  percent,
} from "../features/health-hub/utils";

type ExpenseOperationType = "purchase" | "recurring";
type PaymentType = "credit_card" | "pix";

type Expense = {
  id: string;
  title: string;
  totalAmount: string;
  installments: number;
  date: string;
  notes: string | null;
  operationType: ExpenseOperationType;
  paymentType: PaymentType;
  categoryId: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
};

type Installment = {
  id: string;
  installmentNum: number;
  dueDate: string;
  amount: string;
  paid: boolean;
  paymentType: PaymentType;
  expenseId: string;
  createdAt: string;
  updatedAt: string;
};

type InstallmentsState = {
  loading: boolean;
  error: string | null;
  items: Installment[];
};

type FilterType = "all" | "recurring" | "purchase";

type Category = {
  id: string;
  name: string;
};

type Summary = {
  period: {
    from: string;
    to: string;
  };
  expenses: {
    total: number;
  };
  installments: {
    totalPaid: number;
    totalPending: number;
    countPaid: number;
    countPending: number;
  };
};

// helper pra converter datetime-local em ISO
function toISO(dateTime: string) {
  if (!dateTime) return "";
  return new Date(dateTime).toISOString();
}

// helper simples pra input[type="date"]
function toInputDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

// chave de storage pra range das despesas
const EXPENSES_RANGE_STORAGE_KEY = (userId: string) =>
  `expenses_range_${userId}`;

export default function ExpensesPage() {
  const { data: session, isLoading: loadingSession } = useSession();
  const userId = session?.user?.id ?? "";

  // ===== RANGE DE DATAS =====
  const year = React.useMemo(() => new Date().getFullYear(), []);
  const yearStart = React.useMemo(() => new Date(year, 0, 1), [year]);
  const yearEnd = React.useMemo(() => new Date(year, 11, 31), [year]);

  // valores aplicados (para chamadas de API)
  const [from, setFrom] = React.useState<string>("");
  const [to, setTo] = React.useState<string>("");

  // valores que o usuário está digitando
  const [fromInput, setFromInput] = React.useState<string>("");
  const [toInputValue, setToInputValue] = React.useState<string>("");

  // filtro de tipo (todas / fixas / variáveis)
  const [filter, setFilter] = React.useState<FilterType>("all");

  const [expenses, setExpenses] = React.useState<Expense[]>([]);
  const [loadingExpenses, setLoadingExpenses] = React.useState(true);
  const [errorExpenses, setErrorExpenses] = React.useState<string | null>(null);

  // resumo de gastos/parcelas no período
  const [summary, setSummary] = React.useState<Summary | null>(null);
  const [loadingSummary, setLoadingSummary] = React.useState(false);
  const [errorSummary, setErrorSummary] = React.useState<string | null>(null);
  const [summaryVersion, setSummaryVersion] = React.useState(0); // força refetch

  // estado por despesa → parcelas
  const [installmentsByExpense, setInstallmentsByExpense] =
    React.useState<Record<string, InstallmentsState>>({});
  const [expandedExpenseId, setExpandedExpenseId] =
    React.useState<string | null>(null);

  // categorias para o modal de nova despesa
  const [categories, setCategories] = React.useState<Category[]>([]);
  const [loadingCategories, setLoadingCategories] = React.useState(false);

  // modal de nova despesa
  const [showExpenseModal, setShowExpenseModal] = React.useState(false);
  const [creatingExpense, setCreatingExpense] = React.useState(false);
  const [expenseForm, setExpenseForm] = React.useState({
    title: "",
    totalAmount: "",
    installments: "1",
    date: "",
    notes: "",
    categoryId: "",
    operationType: "recurring" as ExpenseOperationType,
    paymentType: "credit_card" as PaymentType,
  });

  // ====== Inicializa range de datas (salvo em localStorage) ======
  React.useEffect(() => {
    if (!userId) return;

    const key = EXPENSES_RANGE_STORAGE_KEY(userId);
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

    if (!initialFrom || !initialTo) {
      initialFrom = toInputDate(yearStart);
      initialTo = toInputDate(yearEnd);
    }

    setFrom(initialFrom);
    setTo(initialTo);
    setFromInput(initialFrom);
    setToInputValue(initialTo);
  }, [userId, yearStart, yearEnd]);

  // persiste range sempre que aplicado
  React.useEffect(() => {
    if (!userId || !from || !to) return;
    if (typeof window === "undefined") return;

    const key = EXPENSES_RANGE_STORAGE_KEY(userId);
    window.localStorage.setItem(key, JSON.stringify({ from, to }));
  }, [userId, from, to]);

  function applyDateRange() {
    if (!fromInput || !toInputValue) return;
    setFrom(fromInput);
    setTo(toInputValue);
    // summary refetcha via useEffect, nada a fazer aqui
  }

  // ====== Carrega despesas do usuário ======
  const fetchExpenses = React.useCallback(async () => {
    if (!userId) return;

    try {
      setLoadingExpenses(true);
      setErrorExpenses(null);

      const res = await api<Expense[]>(`/expenses/${userId}`, {
        method: "GET",
      });

      setExpenses(res);
    } catch (err) {
      console.error("[ExpensesPage] Erro ao carregar despesas", err);
      const msg =
        err instanceof Error ? err.message : "Erro ao carregar despesas";
      setErrorExpenses(msg);
    } finally {
      setLoadingExpenses(false);
    }
  }, [userId]);

  React.useEffect(() => {
    void fetchExpenses();
  }, [fetchExpenses]);

  // ====== Carrega categorias para o modal ======
  React.useEffect(() => {
    if (!userId) return;

    let cancelled = false;

    async function loadCategories() {
      try {
        setLoadingCategories(true);
        const data = await api<Category[]>(`/categories/list/${userId}`, {
          method: "GET",
        });
        if (!cancelled) {
          setCategories(data);
        }
      } catch (err) {
        console.error("[ExpensesPage] Erro ao carregar categorias", err);
      } finally {
        if (!cancelled) setLoadingCategories(false);
      }
    }

    void loadCategories();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  // ====== Carrega resumo de gastos/parcelas do período ======
  React.useEffect(() => {
    if (!userId || !from || !to) return;

    let cancelled = false;

    async function fetchSummary() {
      try {
        setLoadingSummary(true);
        setErrorSummary(null);

        const params = new URLSearchParams({
          userId,
          from,
          to,
        });

        if (filter === "recurring") {
          params.append("operationType", "recurring");
        } else if (filter === "purchase") {
          params.append("operationType", "purchase");
        }

        const res = await api<Summary>(`/dashboard/summary?${params.toString()}`, {
          method: "GET",
        });

        if (cancelled) return;
        setSummary(res);
      } catch (err) {
        console.error("[ExpensesPage] Erro ao carregar resumo de despesas", err);
        const msg =
          err instanceof Error ? err.message : "Erro ao carregar resumo";
        if (!cancelled) setErrorSummary(msg);
      } finally {
        if (!cancelled) setLoadingSummary(false);
      }
    }

    void fetchSummary();

    return () => {
      cancelled = true;
    };
  }, [userId, from, to, filter, summaryVersion]);

  // ====== Helpers ======
  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString("pt-BR");
  }

  function operationLabel(op: ExpenseOperationType) {
    return op === "recurring" ? "Despesa fixa" : "Despesa variável";
  }

  function paymentLabel(p: PaymentType) {
    return p === "credit_card" ? "Cartão de crédito" : "Pix";
  }

  const filteredExpenses = React.useMemo(() => {
    let result = expenses;

    if (filter === "recurring") {
      result = result.filter((e) => e.operationType === "recurring");
    } else if (filter === "purchase") {
      result = result.filter((e) => e.operationType === "purchase");
    }

    if (from || to) {
      const fromDate = from ? new Date(from) : null;
      const toDate = to ? new Date(to) : null;

      result = result.filter((e) => {
        const d = new Date(e.date);
        if (fromDate && d < fromDate) return false;
        if (toDate && d > toDate) return false;
        return true;
      });
    }

    return result;
  }, [expenses, filter, from, to]);

  // ====== Carregar parcelas de uma despesa ======
  async function loadInstallments(expenseId: string) {
    setInstallmentsByExpense((prev) => ({
      ...prev,
      [expenseId]: {
        loading: true,
        error: null,
        items: prev[expenseId]?.items ?? [],
      },
    }));

    try {
      const res = await api<Installment[]>(`/installments/${expenseId}`, {
        method: "GET",
      });

      setInstallmentsByExpense((prev) => ({
        ...prev,
        [expenseId]: {
          loading: false,
          error: null,
          items: res,
        },
      }));
    } catch (err) {
      console.error("[ExpensesPage] Erro ao carregar parcelas", err);
      const msg =
        err instanceof Error ? err.message : "Erro ao carregar parcelas";
      setInstallmentsByExpense((prev) => ({
        ...prev,
        [expenseId]: {
          loading: false,
          error: msg,
          items: prev[expenseId]?.items ?? [],
        },
      }));
    }
  }

  function handleToggleExpand(expense: Expense) {
    if (expandedExpenseId === expense.id) {
      setExpandedExpenseId(null);
      return;
    }

    setExpandedExpenseId(expense.id);

    const state = installmentsByExpense[expense.id];
    if (!state || state.items.length === 0) {
      void loadInstallments(expense.id);
    }
  }

  // ====== Marcar parcela como paga / não paga ======
  async function handleTogglePaid(
    expenseId: string,
    installmentId: string,
    currentPaid: boolean
  ) {
    try {
      await api(`/installments/${installmentId}`, {
        method: "PUT",
        body: JSON.stringify({
          paid: !currentPaid,
          expenseId,
        }),
      });

      setInstallmentsByExpense((prev) => {
        const state = prev[expenseId];
        if (!state) return prev;

        return {
          ...prev,
          [expenseId]: {
            ...state,
            items: state.items.map((inst) =>
              inst.id === installmentId
                ? { ...inst, paid: !currentPaid }
                : inst
            ),
          },
        };
      });

      // refetch resumo (gasto no período / pagas / pendentes)
      setSummaryVersion((v) => v + 1);
    } catch (err) {
      console.error("[ExpensesPage] Erro ao atualizar parcela", err);
      alert("Não foi possível atualizar o status da parcela.");
    }
  }

  // ====== Criar nova despesa ======
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

      console.log("[ExpensesPage] Despesa criada com sucesso");
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

      void fetchExpenses();
      setSummaryVersion((v) => v + 1);
    } catch (err) {
      console.error("[ExpensesPage] Erro ao criar despesa", err);
      alert("Erro ao criar despesa. Verifique os dados e tente novamente.");
    } finally {
      setCreatingExpense(false);
    }
  }

  // ====== Render ======
  if (loadingSession) {
    return <div className="p-6 text-zinc-200">Carregando sessão…</div>;
  }

  if (!userId) {
    return <div className="p-6 text-zinc-200">Você precisa entrar.</div>;
  }

  if (loadingExpenses) {
    return <div className="p-6 text-zinc-200">Carregando despesas…</div>;
  }

  if (errorExpenses) {
    return (
      <div className="space-y-3 p-6 text-zinc-200">
        <p className="text-sm text-red-400">
          Ocorreu um erro ao carregar as despesas:
        </p>
        <pre className="whitespace-pre-wrap rounded-xl bg-zinc-900 p-3 text-xs text-zinc-300">
          {errorExpenses}
        </pre>
      </div>
    );
  }

  const totalPaid =
    summary?.installments.totalPaid ?? 0;
  const totalPending =
    summary?.installments.totalPending ?? 0;
  const totalInstallmentsValue = totalPaid + totalPending;
  const paidPercent =
    totalInstallmentsValue > 0
      ? percent(totalPaid, totalInstallmentsValue)
      : 0;

  return (
    <div className="space-y-4 p-6">
      {/* Header */}
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-zinc-50">
            <Wallet className="h-6 w-6 text-emerald-400" />
            Despesas
          </h1>
          <p className="mt-1 text-sm text-zinc-400">
            Controle detalhado das suas despesas, fixas e variáveis, com
            acompanhamento de parcelas e pagamentos.
          </p>
        </div>

        <div className="flex flex-col items-end gap-2 sm:flex-row sm:items-center">
          {/* Botão Nova despesa */}
          <button
            type="button"
            onClick={() => setShowExpenseModal(true)}
            className="flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-emerald-50 shadow-sm hover:bg-emerald-500 active:scale-[0.98]"
          >
            <Plus className="h-3 w-3" />
            Nova despesa
          </button>

          {/* Filtros de tipo */}
          <div className="inline-flex rounded-full border border-zinc-800 bg-zinc-900/70 p-1 text-xs">
            <button
              type="button"
              onClick={() => setFilter("all")}
              className={`flex items-center gap-1 rounded-full px-3 py-1.5 transition ${
                filter === "all"
                  ? "bg-emerald-600 text-emerald-50"
                  : "text-zinc-300 hover:bg-zinc-800"
              }`}
            >
              <Wallet className="h-3 w-3" />
              Todas
            </button>
            <button
              type="button"
              onClick={() => setFilter("recurring")}
              className={`ml-1 flex items-center gap-1 rounded-full px-3 py-1.5 transition ${
                filter === "recurring"
                  ? "bg-emerald-600 text-emerald-50"
                  : "text-zinc-300 hover:bg-zinc-800"
              }`}
            >
              <Repeat2 className="h-3 w-3" />
              Fixas
            </button>
            <button
              type="button"
              onClick={() => setFilter("purchase")}
              className={`ml-1 flex items-center gap-1 rounded-full px-3 py-1.5 transition ${
                filter === "purchase"
                  ? "bg-emerald-600 text-emerald-50"
                  : "text-zinc-300 hover:bg-zinc-800"
              }`}
            >
              <Shuffle className="h-3 w-3" />
              Variáveis
            </button>
          </div>
        </div>
      </header>

      {/* Barra de filtro de período */}
      <section className="rounded-2xl border border-zinc-800 bg-zinc-900/60 px-4 py-3 text-xs text-zinc-300 sm:text-sm">
        <div className="flex flex-wrap items-center gap-3">
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
        </div>
      </section>

      {/* Card de RESUMO DO PERÍODO (destaque) */}
      <section className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4">
        {loadingSummary && (
          <p className="text-xs text-zinc-400">
            Calculando gastos e parcelas no período…
          </p>
        )}

        {errorSummary && (
          <p className="text-xs text-red-400">{errorSummary}</p>
        )}

        {summary && !loadingSummary && !errorSummary && (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-medium uppercase text-zinc-400">
                  Gasto no período
                </p>
                <p className="text-2xl font-semibold text-zinc-50">
                  {formatCurrencyBRL(summary.expenses.total)}
                </p>
                <p className="mt-1 text-[11px] text-zinc-500">
                  {formatDateRangeWithTilde(
                    summary.period.from,
                    summary.period.to
                  )}{" "}
                  —{" "}
                  {filter === "recurring"
                    ? "Apenas despesas fixas"
                    : filter === "purchase"
                    ? "Apenas despesas variáveis"
                    : "Todas as despesas"}
                </p>
              </div>

              <div className="flex flex-col items-end gap-1 text-xs">
                <div className="flex items-center gap-1 text-emerald-400">
                  <CheckCircle2 className="h-3 w-3" />
                  <span>
                    {summary.installments.countPaid} parcela(s) paga(s) (
                    {formatCurrencyBRL(summary.installments.totalPaid)})
                  </span>
                </div>
                <div className="flex items-center gap-1 text-amber-300">
                  <Clock4 className="h-3 w-3" />
                  <span>
                    {summary.installments.countPending} pendente(s) (
                    {formatCurrencyBRL(summary.installments.totalPending)})
                  </span>
                </div>
                <div className="text-[11px] text-zinc-400">
                  Progresso:{" "}
                  <span className="font-semibold text-emerald-400">
                    {paidPercent.toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>

            {/* Barrinha simples de progresso */}
            <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-zinc-900">
              <div
                className="h-full rounded-full bg-emerald-500 transition-all"
                style={{ width: `${Math.min(paidPercent, 100)}%` }}
              />
            </div>
          </div>
        )}

        {!summary && !loadingSummary && !errorSummary && (
          <p className="text-xs text-zinc-500">
            Nenhum dado de resumo para o período selecionado.
          </p>
        )}
      </section>

      {/* Lista de despesas */}
      {filteredExpenses.length === 0 ? (
        <p className="text-sm text-zinc-400">
          Nenhuma despesa encontrada para esse filtro/período.
        </p>
      ) : (
        <div className="space-y-3">
          {filteredExpenses.map((expense) => {
            const isExpanded = expandedExpenseId === expense.id;
            const installmentsState = installmentsByExpense[expense.id];
            const hasInstallments = expense.installments >= 1; // compra única também

            return (
              <div
                key={expense.id}
                className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4"
              >
                <div className="flex items-start gap-3">
                  <div className="flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-zinc-100">
                          {expense.title}
                        </p>
                        <p className="text-xs text-zinc-500">
                          {operationLabel(expense.operationType)} •{" "}
                          {paymentLabel(expense.paymentType)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-zinc-50">
                          {formatCurrencyBRL(Number(expense.totalAmount))}
                        </p>
                        <p className="text-[11px] text-zinc-500">
                          {expense.installments}x • Início{" "}
                          {formatDate(expense.date)}
                        </p>
                      </div>
                    </div>

                    {expense.notes && (
                      <p className="mt-2 text-xs text-zinc-400">
                        {expense.notes}
                      </p>
                    )}
                  </div>

                  {hasInstallments && (
                    <button
                      type="button"
                      onClick={() => handleToggleExpand(expense)}
                      className="ml-2 flex items-center gap-1 rounded-full border border-zinc-700 px-2 py-1 text-[11px] text-zinc-200 hover:border-emerald-500 hover:text-emerald-300"
                    >
                      {isExpanded ? (
                        <>
                          <ChevronUp className="h-3 w-3" />
                          Ocultar parcela
                          {expense.installments > 1 && "s"}
                        </>
                      ) : (
                        <>
                          <ChevronDown className="h-3 w-3" />
                          Ver parcela
                          {expense.installments > 1 && "s"}
                        </>
                      )}
                    </button>
                  )}
                </div>

                {/* Parcelas (inclusive compra única) */}
                {hasInstallments && isExpanded && (
                  <div className="mt-3 rounded-xl border border-zinc-800 bg-zinc-900/60 p-3">
                    {installmentsState?.loading && (
                      <p className="text-xs text-zinc-400">
                        Carregando parcelas…
                      </p>
                    )}

                    {installmentsState?.error && (
                      <p className="text-xs text-red-400">
                        {installmentsState.error}
                      </p>
                    )}

                    {installmentsState &&
                      !installmentsState.loading &&
                      installmentsState.items.length > 0 && (
                        <ul className="space-y-2 text-xs text-zinc-200">
                          {installmentsState.items.map((inst) => (
                            <li
                              key={inst.id}
                              className="flex items-center justify-between gap-2 rounded-lg bg-zinc-950/80 px-2 py-1.5"
                            >
                              <div>
                                <p className="font-medium">
                                  Parcela {inst.installmentNum} de{" "}
                                  {expense.installments}
                                </p>
                                <p className="text-[11px] text-zinc-500">
                                  Vencimento: {formatDate(inst.dueDate)} •{" "}
                                  {paymentLabel(inst.paymentType)}
                                </p>
                              </div>
                              <div className="flex items-center gap-3">
                                <span className="font-semibold">
                                  {formatCurrencyBRL(Number(inst.amount))}
                                </span>
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleTogglePaid(
                                      expense.id,
                                      inst.id,
                                      inst.paid
                                    )
                                  }
                                  className="flex items-center gap-1 rounded-full border border-zinc-700 px-2 py-1 text-[11px] hover:border-emerald-500 hover:text-emerald-300"
                                >
                                  {inst.paid ? (
                                    <>
                                      <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                                      Pago
                                    </>
                                  ) : (
                                    <>
                                      <Circle className="h-3 w-3 text-zinc-500" />
                                      Marcar como pago
                                    </>
                                  )}
                                </button>
                              </div>
                            </li>
                          ))}
                        </ul>
                      )}

                    {installmentsState &&
                      !installmentsState.loading &&
                      installmentsState.items.length === 0 && (
                        <p className="text-xs text-zinc-400">
                          Nenhuma parcela encontrada para esta despesa.
                        </p>
                      )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ===== MODAL: Nova despesa ===== */}
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
                        operationType: e.target
                          .value as ExpenseOperationType,
                      }))
                    }
                    className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-950 px-2 py-1 text-xs outline-none focus:border-emerald-500"
                  >
                    <option value="recurring">Despesa fixa</option>
                    <option value="purchase">Despesa variável</option>
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
                        paymentType: e.target.value as PaymentType,
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
    </div>
  );
}

// // src/pages/ExpensesPage.tsx
// import React from "react";
// import { useSession } from "../lib/useSession";
// import { api } from "../lib/http";
// import {
//   Wallet,
//   Repeat2,
//   ChevronDown,
//   ChevronUp,
//   CheckCircle2,
//   Circle,
// } from "lucide-react";
// import { formatCurrencyBRL } from "../features/health-hub/utils";

// type ExpenseOperationType = "purchase" | "recurring";
// type PaymentType = "credit_card" | "pix";

// type Expense = {
//   id: string;
//   title: string;
//   totalAmount: string;
//   installments: number;
//   date: string;
//   notes: string | null;
//   operationType: ExpenseOperationType;
//   paymentType: PaymentType;
//   categoryId: string;
//   userId: string;
//   createdAt: string;
//   updatedAt: string;
// };

// type Installment = {
//   id: string;
//   installmentNum: number;
//   dueDate: string;
//   amount: string;
//   paid: boolean;
//   paymentType: PaymentType;
//   expenseId: string;
//   createdAt: string;
//   updatedAt: string;
// };

// type InstallmentsState = {
//   loading: boolean;
//   error: string | null;
//   items: Installment[];
// };

// type FilterType = "all" | "recurring";

// export default function ExpensesPage() {
//   const { data: session, isLoading: loadingSession } = useSession();
//   const userId = session?.user?.id ?? "";

//   const [expenses, setExpenses] = React.useState<Expense[]>([]);
//   const [loadingExpenses, setLoadingExpenses] = React.useState(true);
//   const [errorExpenses, setErrorExpenses] = React.useState<string | null>(null);

//   const [filter, setFilter] = React.useState<FilterType>("all");

//   // estado por despesa → parcelas
//   const [installmentsByExpense, setInstallmentsByExpense] =
//     React.useState<Record<string, InstallmentsState>>({});
//   const [expandedExpenseId, setExpandedExpenseId] =
//     React.useState<string | null>(null);

//   // ====== Carrega despesas do usuário ======
//   React.useEffect(() => {
//     if (!userId) return;

//     async function fetchExpenses() {
//       try {
//         setLoadingExpenses(true);
//         setErrorExpenses(null);

//         const res = await api<Expense[]>(`/expenses/${userId}`, {
//           method: "GET",
//         });

//         setExpenses(res);
//       } catch (err) {
//         console.error("[ExpensesPage] Erro ao carregar despesas", err);
//         const msg =
//           err instanceof Error ? err.message : "Erro ao carregar despesas";
//         setErrorExpenses(msg);
//       } finally {
//         setLoadingExpenses(false);
//       }
//     }

//     fetchExpenses();
//   }, [userId]);

//   // ====== Helpers ======
//   function formatDate(dateStr: string) {
//     return new Date(dateStr).toLocaleDateString("pt-BR");
//   }

//   function operationLabel(op: ExpenseOperationType) {
//     return op === "recurring" ? "Recorrente" : "Compra única";
//   }

//   function paymentLabel(p: PaymentType) {
//     return p === "credit_card" ? "Cartão de crédito" : "Pix";
//   }

//   const filteredExpenses = React.useMemo(() => {
//     if (filter === "recurring") {
//       return expenses.filter((e) => e.operationType === "recurring");
//     }
//     return expenses;
//   }, [expenses, filter]);

//   // ====== Carregar parcelas de uma despesa ======
//   async function loadInstallments(expenseId: string) {
//     setInstallmentsByExpense((prev) => ({
//       ...prev,
//       [expenseId]: {
//         loading: true,
//         error: null,
//         items: prev[expenseId]?.items ?? [],
//       },
//     }));

//     try {
//       const res = await api<Installment[]>(`/installments/${expenseId}`, {
//         method: "GET",
//       });

//       setInstallmentsByExpense((prev) => ({
//         ...prev,
//         [expenseId]: {
//           loading: false,
//           error: null,
//           items: res,
//         },
//       }));
//     } catch (err) {
//       console.error("[ExpensesPage] Erro ao carregar parcelas", err);
//       const msg =
//         err instanceof Error ? err.message : "Erro ao carregar parcelas";
//       setInstallmentsByExpense((prev) => ({
//         ...prev,
//         [expenseId]: {
//           loading: false,
//           error: msg,
//           items: prev[expenseId]?.items ?? [],
//         },
//       }));
//     }
//   }

//   function handleToggleExpand(expense: Expense) {
//     if (expandedExpenseId === expense.id) {
//       setExpandedExpenseId(null);
//       return;
//     }

//     setExpandedExpenseId(expense.id);

//     // se ainda não buscamos as parcelas, busca agora
//     const state = installmentsByExpense[expense.id];
//     if (!state || state.items.length === 0) {
//       void loadInstallments(expense.id);
//     }
//   }

//   // ====== Marcar parcela como paga / não paga ======
//   async function handleTogglePaid(
//     expenseId: string,
//     installmentId: string,
//     currentPaid: boolean
//   ) {
//     try {
//       await api(`/installments/${installmentId}`, {
//         method: "PUT", // <-- corrigido de PATCH para PUT
//         body: JSON.stringify({
//           paid: !currentPaid,
//           expenseId,
//         }),
//       });

//       // Atualiza estado local
//       setInstallmentsByExpense((prev) => {
//         const state = prev[expenseId];
//         if (!state) return prev;

//         return {
//           ...prev,
//           [expenseId]: {
//             ...state,
//             items: state.items.map((inst) =>
//               inst.id === installmentId
//                 ? { ...inst, paid: !currentPaid }
//                 : inst
//             ),
//           },
//         };
//       });
//     } catch (err) {
//       console.error("[ExpensesPage] Erro ao atualizar parcela", err);
//       alert("Não foi possível atualizar o status da parcela.");
//     }
//   }

//   // ====== Render ======
//   if (loadingSession) {
//     return <div className="p-6 text-zinc-200">Carregando sessão…</div>;
//   }

//   if (!userId) {
//     return <div className="p-6 text-zinc-200">Você precisa entrar.</div>;
//   }

//   if (loadingExpenses) {
//     return <div className="p-6 text-zinc-200">Carregando despesas…</div>;
//   }

//   if (errorExpenses) {
//     return (
//       <div className="space-y-3 p-6 text-zinc-200">
//         <p className="text-sm text-red-400">
//           Ocorreu um erro ao carregar as despesas:
//         </p>
//         <pre className="whitespace-pre-wrap rounded-xl bg-zinc-900 p-3 text-xs text-zinc-300">
//           {errorExpenses}
//         </pre>
//       </div>
//     );
//   }

//   return (
//     <div className="space-y-4 p-6">
//       {/* Header */}
//       <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
//         <div>
//           <h1 className="flex items-center gap-2 text-2xl font-bold text-zinc-50">
//             <Wallet className="h-6 w-6 text-emerald-400" />
//             Despesas
//           </h1>
//           <p className="mt-1 text-sm text-zinc-400">
//             Gerencie suas despesas únicas e recorrentes, acompanhe parcelas e
//             marque pagamentos.
//           </p>
//         </div>

//         {/* Filtros de tipo */}
//         <div className="inline-flex rounded-full border border-zinc-800 bg-zinc-900/70 p-1 text-xs">
//           <button
//             type="button"
//             onClick={() => setFilter("all")}
//             className={`flex items-center gap-1 rounded-full px-3 py-1.5 transition ${
//               filter === "all"
//                 ? "bg-emerald-600 text-emerald-50"
//                 : "text-zinc-300 hover:bg-zinc-800"
//             }`}
//           >
//             <Wallet className="h-3 w-3" />
//             Despesas
//           </button>
//           <button
//             type="button"
//             onClick={() => setFilter("recurring")}
//             className={`ml-1 flex items-center gap-1 rounded-full px-3 py-1.5 transition ${
//               filter === "recurring"
//                 ? "bg-emerald-600 text-emerald-50"
//                 : "text-zinc-300 hover:bg-zinc-800"
//             }`}
//           >
//             <Repeat2 className="h-3 w-3" />
//             Despesas recorrentes
//           </button>
//         </div>
//       </header>

//       {/* Lista de despesas */}
//       {filteredExpenses.length === 0 ? (
//         <p className="text-sm text-zinc-400">
//           Nenhuma despesa encontrada para esse filtro.
//         </p>
//       ) : (
//         <div className="space-y-3">
//           {filteredExpenses.map((expense) => {
//             const isExpanded = expandedExpenseId === expense.id;
//             const installmentsState = installmentsByExpense[expense.id];
//             const hasInstallments = expense.installments > 1;

//             return (
//               <div
//                 key={expense.id}
//                 className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4"
//               >
//                 <div className="flex items-start gap-3">
//                   <div className="flex-1">
//                     <div className="flex items-center justify-between gap-2">
//                       <div>
//                         <p className="text-sm font-semibold text-zinc-100">
//                           {expense.title}
//                         </p>
//                         <p className="text-xs text-zinc-500">
//                           {operationLabel(expense.operationType)} •{" "}
//                           {paymentLabel(expense.paymentType)}
//                         </p>
//                       </div>
//                       <div className="text-right">
//                         <p className="text-sm font-semibold text-zinc-50">
//                           {formatCurrencyBRL(Number(expense.totalAmount))}
//                         </p>
//                         <p className="text-[11px] text-zinc-500">
//                           {expense.installments}x • Início{" "}
//                           {formatDate(expense.date)}
//                         </p>
//                       </div>
//                     </div>

//                     {expense.notes && (
//                       <p className="mt-2 text-xs text-zinc-400">
//                         {expense.notes}
//                       </p>
//                     )}
//                   </div>

//                   {hasInstallments && (
//                     <button
//                       type="button"
//                       onClick={() => handleToggleExpand(expense)}
//                       className="ml-2 flex items-center gap-1 rounded-full border border-zinc-700 px-2 py-1 text-[11px] text-zinc-200 hover:border-emerald-500 hover:text-emerald-300"
//                     >
//                       {isExpanded ? (
//                         <>
//                           <ChevronUp className="h-3 w-3" />
//                           Ocultar parcelas
//                         </>
//                       ) : (
//                         <>
//                           <ChevronDown className="h-3 w-3" />
//                           Ver parcelas
//                         </>
//                       )}
//                     </button>
//                   )}
//                 </div>

//                 {/* Parcelas */}
//                 {hasInstallments && isExpanded && (
//                   <div className="mt-3 rounded-xl border border-zinc-800 bg-zinc-900/60 p-3">
//                     {installmentsState?.loading && (
//                       <p className="text-xs text-zinc-400">
//                         Carregando parcelas…
//                       </p>
//                     )}

//                     {installmentsState?.error && (
//                       <p className="text-xs text-red-400">
//                         {installmentsState.error}
//                       </p>
//                     )}

//                     {installmentsState &&
//                       !installmentsState.loading &&
//                       installmentsState.items.length > 0 && (
//                         <ul className="space-y-2 text-xs text-zinc-200">
//                           {installmentsState.items.map((inst) => (
//                             <li
//                               key={inst.id}
//                               className="flex items-center justify-between gap-2 rounded-lg bg-zinc-950/80 px-2 py-1.5"
//                             >
//                               <div>
//                                 <p className="font-medium">
//                                   Parcela {inst.installmentNum} de{" "}
//                                   {expense.installments}
//                                 </p>
//                                 <p className="text-[11px] text-zinc-500">
//                                   Vencimento: {formatDate(inst.dueDate)} •{" "}
//                                   {paymentLabel(inst.paymentType)}
//                                 </p>
//                               </div>
//                               <div className="flex items-center gap-3">
//                                 <span className="font-semibold">
//                                   {formatCurrencyBRL(Number(inst.amount))}
//                                 </span>
//                                 <button
//                                   type="button"
//                                   onClick={() =>
//                                     handleTogglePaid(
//                                       expense.id,
//                                       inst.id,
//                                       inst.paid
//                                     )
//                                   }
//                                   className="flex items-center gap-1 rounded-full border border-zinc-700 px-2 py-1 text-[11px] hover:border-emerald-500 hover:text-emerald-300"
//                                 >
//                                   {inst.paid ? (
//                                     <>
//                                       <CheckCircle2 className="h-3 w-3 text-emerald-400" />
//                                       Pago
//                                     </>
//                                   ) : (
//                                     <>
//                                       <Circle className="h-3 w-3 text-zinc-500" />
//                                       Marcar como pago
//                                     </>
//                                   )}
//                                 </button>
//                               </div>
//                             </li>
//                           ))}
//                         </ul>
//                       )}

//                     {installmentsState &&
//                       !installmentsState.loading &&
//                       installmentsState.items.length === 0 && (
//                         <p className="text-xs text-zinc-400">
//                           Nenhuma parcela encontrada para esta despesa.
//                         </p>
//                       )}
//                   </div>
//                 )}
//               </div>
//             );
//           })}
//         </div>
//       )}
//     </div>
//   );
// }
