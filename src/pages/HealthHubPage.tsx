import React from "react";
import { useSession } from "../lib/useSession";
import { api } from "../lib/http";
import {
  Wallet,
  BarChart2,
  CalendarRange,
  TrendingUp,
  CheckCircle2,
  Clock4,
} from "lucide-react";

// ===== Tipos vindos da API =====
type Position = {
  assetId: string;
  name: string;
  type: "crypto" | "stock" | "fiat" | string;
  quantity: number;
  invested: number;
  averagePrice: number;
  averagePriceBRL?: string;
  averagePriceUSD?: string;
};

type Rates = {
  btc_usd: number;
  btc_brl: number;
  usd_brl: number;
  source: string;
  fetchedAt: string;
};

type PositionsResponse = {
  positions: Position[];
  rates: Rates;
};

type DashboardSummary = {
  period: {
    from: string; // ISO
    to: string;   // ISO
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

type WealthOverview = {
  positions: Position[];
  rates: Rates;
  period: DashboardSummary["period"];
  expenses: DashboardSummary["expenses"];
  installments: DashboardSummary["installments"];
};

type OperationType = "purchase" | "recurring";

// ===== Helpers =====
function formatCurrencyBRL(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 2,
  }).format(value);
}

function formatDateRangeWithTilde(fromISO: string, toISO: string) {
  const from = new Date(fromISO);
  const to = new Date(toISO);

  const fmt = new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  return `${fmt.format(from)} ~ ${fmt.format(to)}`;
}

function percent(part: number, total: number): number {
  if (!total || total <= 0) return 0;
  return (part / total) * 100;
}

function toInputDate(d: Date): string {
  return d.toISOString().slice(0, 10); // yyyy-MM-dd
}

const WEALTH_RANGE_STORAGE_KEY = (userId: string) =>
  `wealthhub:date-range:${userId}`;

// ===== Hook que chama sua API =====
function useWealthOverview(
  userId: string,
  from: string,
  to: string,
  operationType: OperationType
) {
  const [data, setData] = React.useState<WealthOverview | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!userId || !from || !to || !operationType) return;

    let cancelled = false;
    setLoading(true);
    setError(null);

    async function fetchAll() {
      try {
        console.log("[WealthHub] Fetch iniciando", {
          userId,
          from,
          to,
          operationType,
        });

        // 1) posições + fx
        const positionsUrl = `/investment-transactions/investment-transactions/positions-with-fx/${userId}`;
        console.log("[WealthHub] GET", positionsUrl);
        const positionsPromise = api<PositionsResponse>(positionsUrl, {
          method: "GET",
        });

        // 2) resumo do dashboard com range de datas + operationType
        const params = new URLSearchParams({
          userId,
          from, // yyyy-MM-dd
          to,   // yyyy-MM-dd
          operationType,
        });
        const summaryUrl = `/dashboard/summary?${params.toString()}`;
        console.log("[WealthHub] GET", summaryUrl);

        const summaryPromise = api<DashboardSummary>(summaryUrl, {
          method: "GET",
        });

        const [positionsRes, summaryRes] = await Promise.all([
          positionsPromise,
          summaryPromise,
        ]);

        console.log("[WealthHub] Responses", {
          positionsRes,
          summaryRes,
        });

        if (cancelled) return;

        setData({
          positions: positionsRes.positions,
          rates: positionsRes.rates,
          period: summaryRes.period,
          expenses: summaryRes.expenses,
          installments: summaryRes.installments,
        });
        setLastUpdated(new Date().toISOString());
      } catch (err) {
        if (cancelled) return;
        const msg =
          err instanceof Error ? err.message : "Erro ao carregar Wealth Hub";
        console.error("[WealthHub] Erro fetchAll", err);
        setError(msg);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchAll();

    return () => {
      cancelled = true;
    };
  }, [userId, from, to, operationType]);

  return { data, loading, error, lastUpdated };
}

// ===== Componentes de UI simples =====
function Card(props: {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-300">
          {props.title}
        </h2>
        {props.icon && <div className="text-zinc-400">{props.icon}</div>}
      </div>
      {props.children}
    </div>
  );
}

function ProgressBar(props: {
  value: number;
  labelLeft: string;
  labelRight: string;
}) {
  const clamped = Math.max(0, Math.min(100, props.value));

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs text-zinc-400">
        <span>{props.labelLeft}</span>
        <span>{props.labelRight}</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-800">
        <div
          className="h-full rounded-full bg-emerald-500"
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
}

// ===== Página principal: Wealth Hub =====
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
    React.useState<OperationType>("purchase");

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
    operationType === "purchase" ? "Compras únicas" : "Recorrentes";

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
              value={operationType}
              onChange={(e) =>
                setOperationType(e.target.value as OperationType)
              }
              className="rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs text-zinc-100 outline-none focus:border-emerald-500"
            >
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
                            ? formatCurrencyBRL(
                                Number(pos.averagePriceBRL)
                              )
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
    </div>
  );
}


// import React from "react";
// import { useSession } from "../lib/useSession";
// import { api } from "../lib/http";
// import {
//   Wallet,
//   BarChart2,
//   CalendarRange,
//   TrendingUp,
//   CheckCircle2,
//   Clock4,
// } from "lucide-react";

// // ===== Tipos vindos da API =====
// type Position = {
//   assetId: string;
//   name: string;
//   type: "crypto" | "stock" | "fiat" | string;
//   quantity: number;
//   invested: number;
//   averagePrice: number;
//   averagePriceBRL?: string;
//   averagePriceUSD?: string;
// };

// type Rates = {
//   btc_usd: number;
//   btc_brl: number;
//   usd_brl: number;
//   source: string;
//   fetchedAt: string;
// };

// type PositionsResponse = {
//   positions: Position[];
//   rates: Rates;
// };

// type DashboardSummary = {
//   period: {
//     from: string; // ISO
//     to: string;   // ISO
//   };
//   expenses: {
//     total: number;
//   };
//   installments: {
//     totalPaid: number;
//     totalPending: number;
//     countPaid: number;
//     countPending: number;
//   };
// };

// type WealthOverview = {
//   positions: Position[];
//   rates: Rates;
//   period: DashboardSummary["period"];
//   expenses: DashboardSummary["expenses"];
//   installments: DashboardSummary["installments"];
// };

// type OperationType = "purchase" | "recurring";

// // ===== Helpers =====
// function formatCurrencyBRL(value: number) {
//   return new Intl.NumberFormat("pt-BR", {
//     style: "currency",
//     currency: "BRL",
//     maximumFractionDigits: 2,
//   }).format(value);
// }

// function formatDateRange(fromISO: string, toISO: string) {
//   const from = new Date(fromISO);
//   const to = new Date(toISO);

//   const fmt = new Intl.DateTimeFormat("pt-BR", {
//     day: "2-digit",
//     month: "short",
//     year: "numeric",
//   });

//   return `${fmt.format(from)} — ${fmt.format(to)}`;
// }

// function percent(part: number, total: number): number {
//   if (!total || total <= 0) return 0;
//   return (part / total) * 100;
// }

// function toInputDate(d: Date): string {
//   return d.toISOString().slice(0, 10); // yyyy-MM-dd
// }

// const WEALTH_RANGE_STORAGE_KEY = (userId: string) =>
//   `wealthhub:date-range:${userId}`;

// // ===== Hook que chama sua API =====
// function useWealthOverview(
//   userId: string,
//   from: string,
//   to: string,
//   operationType: OperationType
// ) {
//   const [data, setData] = React.useState<WealthOverview | null>(null);
//   const [loading, setLoading] = React.useState(true);
//   const [error, setError] = React.useState<string | null>(null);
//   const [lastUpdated, setLastUpdated] = React.useState<string | null>(null);

//   React.useEffect(() => {
//     if (!userId || !from || !to || !operationType) return;

//     let cancelled = false;
//     setLoading(true);
//     setError(null);

//     async function fetchAll() {
//       try {
//         console.log("[WealthHub] Fetch iniciando", {
//           userId,
//           from,
//           to,
//           operationType,
//         });

//         // 1) posições + fx
//         const positionsUrl = `/investment-transactions/investment-transactions/positions-with-fx/${userId}`;
//         console.log("[WealthHub] GET", positionsUrl);
//         const positionsPromise = api<PositionsResponse>(positionsUrl, {
//           method: "GET",
//         });

//         // 2) resumo do dashboard com range de datas + operationType
//         const params = new URLSearchParams({
//           userId,
//           from, // yyyy-MM-dd
//           to,   // yyyy-MM-dd
//           operationType, // "purchase" | "recurring"
//         });
//         const summaryUrl = `/dashboard/summary?${params.toString()}`;
//         console.log("[WealthHub] GET", summaryUrl);

//         const summaryPromise = api<DashboardSummary>(summaryUrl, {
//           method: "GET",
//         });

//         const [positionsRes, summaryRes] = await Promise.all([
//           positionsPromise,
//           summaryPromise,
//         ]);

//         console.log("[WealthHub] Responses", {
//           positionsRes,
//           summaryRes,
//         });

//         if (cancelled) return;

//         setData({
//           positions: positionsRes.positions,
//           rates: positionsRes.rates,
//           period: summaryRes.period,
//           expenses: summaryRes.expenses,
//           installments: summaryRes.installments,
//         });
//         setLastUpdated(new Date().toISOString());
//       } catch (err) {
//         if (cancelled) return;
//         const msg =
//           err instanceof Error ? err.message : "Erro ao carregar Wealth Hub";
//         console.error("[WealthHub] Erro fetchAll", err);
//         setError(msg);
//       } finally {
//         if (!cancelled) setLoading(false);
//       }
//     }

//     fetchAll();

//     return () => {
//       cancelled = true;
//     };
//   }, [userId, from, to, operationType]);

//   return { data, loading, error, lastUpdated };
// }

// // ===== Componentes de UI simples =====
// function Card(props: {
//   title: string;
//   icon?: React.ReactNode;
//   children: React.ReactNode;
// }) {
//   return (
//     <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4 shadow-sm">
//       <div className="mb-3 flex items-center justify-between gap-2">
//         <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-300">
//           {props.title}
//         </h2>
//         {props.icon && <div className="text-zinc-400">{props.icon}</div>}
//       </div>
//       {props.children}
//     </div>
//   );
// }

// function ProgressBar(props: {
//   value: number;
//   labelLeft: string;
//   labelRight: string;
// }) {
//   const clamped = Math.max(0, Math.min(100, props.value));

//   return (
//     <div className="space-y-2">
//       <div className="flex items-center justify-between text-xs text-zinc-400">
//         <span>{props.labelLeft}</span>
//         <span>{props.labelRight}</span>
//       </div>
//       <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-800">
//         <div
//           className="h-full rounded-full bg-emerald-500"
//           style={{ width: `${clamped}%` }}
//         />
//       </div>
//     </div>
//   );
// }

// // ===== Página principal: Wealth Hub =====
// export default function WealthHubPage() {
//   const { data: session, isLoading: loadingSession } = useSession();
//   const userId = session?.user?.id ?? "";

//   // ===== Filtro de datas (range) =====
//   // padrão: ano vigente inteiro (01/01 até 31/12)
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
//     React.useState<OperationType>("purchase");

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
//     operationType === "purchase" ? "Compras únicas" : "Recorrentes";

//   return (
//     <div className="space-y-6">
//       {/* Header */}
//       <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
//         <div>
//           <h1 className="flex items-center gap-2 text-2xl font-bold text-zinc-50">
//             <Wallet className="h-6 w-6 text-emerald-400" />
//             Wealth Hub
//           </h1>
//           <p className="mt-1 text-sm text-zinc-400">
//             Visão consolidada do seu patrimônio, gastos e parcelas.
//           </p>

//           {rates && (
//             <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-zinc-500">
//               <span>
//                 BTC/USD:&nbsp;
//                 <span className="font-mono text-zinc-200">
//                   {new Intl.NumberFormat("en-US", {
//                     style: "currency",
//                     currency: "USD",
//                     maximumFractionDigits: 0,
//                   }).format(rates.btc_usd)}
//                 </span>
//               </span>
//               <span>
//                 BTC/BRL:&nbsp;
//                 <span className="font-mono text-zinc-200">
//                   {formatCurrencyBRL(rates.btc_brl)}
//                 </span>
//               </span>
//               <span>
//                 USD/BRL:&nbsp;
//                 <span className="font-mono text-zinc-200">
//                   {rates.usd_brl.toFixed(3)}
//                 </span>
//               </span>
//               {lastUpdated && (
//                 <span className="text-[10px] text-zinc-500">
//                   Atualizado em{" "}
//                   {new Date(lastUpdated).toLocaleTimeString("pt-BR")}
//                 </span>
//               )}
//             </div>
//           )}
//         </div>

//         {/* Filtro de datas + tipo de operação */}
//         <div className="flex flex-col items-start gap-2 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-3 text-xs text-zinc-300 sm:flex-row sm:items-center sm:text-sm">
//           <div className="flex flex-col gap-2">
//             <div className="flex items-center gap-2">
//               <CalendarRange className="h-4 w-4 text-zinc-400" />
//               <span className="font-medium text-zinc-200">Período</span>
//             </div>
//             <div className="flex flex-wrap items-center gap-2">
//               <label className="flex items-center gap-1">
//                 <span className="text-zinc-400">De</span>
//                 <input
//                   type="date"
//                   value={fromInput}
//                   onChange={(e) => setFromInput(e.target.value)}
//                   className="rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs text-zinc-100 outline-none focus:border-emerald-500"
//                 />
//               </label>
//               <span className="text-zinc-500">→</span>
//               <label className="flex items-center gap-1">
//                 <span className="text-zinc-400">Até</span>
//                 <input
//                   type="date"
//                   value={toInputValue}
//                   onChange={(e) => setToInputValue(e.target.value)}
//                   className="rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs text-zinc-100 outline-none focus:border-emerald-500"
//                 />
//               </label>
//               <button
//                 type="button"
//                 onClick={applyDateRange}
//                 className="rounded-md border border-emerald-500 px-3 py-1 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/10 active:scale-[0.98]"
//               >
//                 Aplicar
//               </button>
//             </div>
//           </div>

//           <div className="h-px w-full bg-zinc-800 sm:h-8 sm:w-px sm:self-stretch" />

//           <div className="flex flex-col gap-1">
//             <span className="text-[10px] font-medium uppercase tracking-wide text-zinc-400">
//               Tipo de operação
//             </span>
//             <select
//               value={operationType}
//               onChange={(e) =>
//                 setOperationType(e.target.value as OperationType)
//               }
//               className="rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs text-zinc-100 outline-none focus:border-emerald-500"
//             >
//               <option value="purchase">Compras únicas</option>
//               <option value="recurring">Recorrentes</option>
//             </select>
//           </div>
//         </div>
//       </header>

//       {/* Cards resumo */}
//       <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
//         <Card
//           title="Total Investido"
//           icon={<BarChart2 className="h-4 w-4 text-emerald-400" />}
//         >
//           <p className="text-2xl font-semibold text-zinc-50">
//             {formatCurrencyBRL(totalInvested)}
//           </p>
//           <p className="mt-1 text-xs text-zinc-400">
//             Somando todos os ativos cadastrados.
//           </p>
//         </Card>

//         {/* Card unificado: Gastos + Parcelas + Período */}
//         <Card
//           title="Gastos e Parcelas"
//           icon={<TrendingUp className="h-4 w-4 text-rose-400" />}
//         >
//           <div className="space-y-3">
//             <div className="flex items-start justify-between gap-4">
//               <div>
//                 <p className="text-xs font-medium uppercase text-zinc-400">
//                   Gastos no período
//                 </p>
//                 <p className="text-2xl font-semibold text-zinc-50">
//                   {formatCurrencyBRL(expenses.total)}
//                 </p>
//                 <p className="mt-1 text-xs text-zinc-400">
//                   Considerando apenas:{" "}
//                   <span className="font-semibold text-zinc-200">
//                     {operationTypeLabel}
//                   </span>
//                   .
//                 </p>
//               </div>
//               <div className="text-right text-[11px] text-zinc-500">
//                 <p className="font-medium text-zinc-400">Período aplicado</p>
//                 <p>{formatDateRange(period.from, period.to)}</p>
//               </div>
//             </div>

//             <div className="h-px w-full bg-zinc-800" />

//             <div>
//               <div className="mb-2 flex items-center justify-between text-sm">
//                 <div className="flex items-center gap-1 text-emerald-400">
//                   <CheckCircle2 className="h-4 w-4" />
//                   <span>
//                     {installments.countPaid} pagas (
//                     {formatCurrencyBRL(installments.totalPaid)})
//                   </span>
//                 </div>
//               </div>

//               <div className="mb-3 flex items-center justify-between text-sm">
//                 <div className="flex items-center gap-1 text-amber-300">
//                   <Clock4 className="h-4 w-4" />
//                   <span>
//                     {installments.countPending} pendentes (
//                     {formatCurrencyBRL(installments.totalPending)})
//                   </span>
//                 </div>
//               </div>

//               <ProgressBar
//                 value={paidPercent}
//                 labelLeft="Progresso de pagamento"
//                 labelRight={`${paidPercent.toFixed(0)}%`}
//               />
//             </div>
//           </div>
//         </Card>
//       </section>

//       {/* Grid principal */}
//       <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
//         {/* Tabela de posições */}
//         <Card
//           title="Posições"
//           icon={<BarChart2 className="h-4 w-4 text-zinc-300" />}
//         >
//           {positions.length === 0 ? (
//             <p className="text-sm text-zinc-400">
//               Nenhum ativo cadastrado ainda.
//             </p>
//           ) : (
//             <div className="overflow-x-auto">
//               <table className="min-w-full text-sm">
//                 <thead>
//                   <tr className="border-b border-zinc-800 text-zinc-400">
//                     <th className="py-2 pr-3 text-left font-medium">Ativo</th>
//                     <th className="px-3 py-2 text-right font-medium">
//                       Quantidade
//                     </th>
//                     <th className="px-3 py-2 text-right font-medium">
//                       Investido
//                     </th>
//                     <th className="pl-3 py-2 text-right font-medium">
//                       Preço Médio (BRL)
//                     </th>
//                   </tr>
//                 </thead>
//                 <tbody>
//                   {positions.map((pos) => (
//                     <tr
//                       key={pos.assetId}
//                       className="border-b border-zinc-900/60 last:border-0"
//                     >
//                       <td className="py-2 pr-3">
//                         <div className="flex flex-col">
//                           <span className="font-medium uppercase text-zinc-50">
//                             {pos.name}
//                           </span>
//                           <span className="text-xs text-zinc-500">
//                             {pos.type === "crypto" ? "Cripto" : pos.type}
//                           </span>
//                         </div>
//                       </td>
//                       <td className="px-3 py-2 text-right text-zinc-100">
//                         {pos.quantity}
//                       </td>
//                       <td className="px-3 py-2 text-right text-zinc-100">
//                         {formatCurrencyBRL(pos.invested)}
//                       </td>
//                       <td className="pl-3 py-2 text-right text-zinc-100">
//                         {pos.averagePriceBRL
//                           ? formatCurrencyBRL(Number(pos.averagePriceBRL))
//                           : formatCurrencyBRL(pos.averagePrice)}
//                       </td>
//                     </tr>
//                   ))}
//                 </tbody>
//               </table>
//             </div>
//           )}
//         </Card>

//         {/* Coluna direita */}
//         <div className="space-y-4 lg:col-span-2">
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
//     </div>
//   );
// }


// import React from "react";
// import { useSession } from "../lib/useSession";
// import { api } from "../lib/http";
// import {
//   Wallet,
//   BarChart2,
//   CalendarRange,
//   TrendingUp,
//   CheckCircle2,
//   Clock4,
// } from "lucide-react";

// // ===== Tipos vindos da API =====
// type Position = {
//   assetId: string;
//   name: string;
//   type: "crypto" | "stock" | "fiat" | string;
//   quantity: number;
//   invested: number;
//   averagePrice: number;
//   averagePriceBRL?: string;
//   averagePriceUSD?: string;
// };

// type Rates = {
//   btc_usd: number;
//   btc_brl: number;
//   usd_brl: number;
//   source: string;
//   fetchedAt: string;
// };

// type PositionsResponse = {
//   positions: Position[];
//   rates: Rates;
// };

// type DashboardSummary = {
//   period: {
//     from: string; // ISO
//     to: string;   // ISO
//   };
//   expenses: {
//     total: number;
//   };
//   installments: {
//     totalPaid: number;
//     totalPending: number;
//     countPaid: number;
//     countPending: number;
//   };
// };

// type WealthOverview = {
//   positions: Position[];
//   rates: Rates;
//   period: DashboardSummary["period"];
//   expenses: DashboardSummary["expenses"];
//   installments: DashboardSummary["installments"];
// };

// // ===== Helpers =====
// function formatCurrencyBRL(value: number) {
//   return new Intl.NumberFormat("pt-BR", {
//     style: "currency",
//     currency: "BRL",
//     maximumFractionDigits: 2,
//   }).format(value);
// }

// function formatDateRange(fromISO: string, toISO: string) {
//   const from = new Date(fromISO);
//   const to = new Date(toISO);

//   const fmt = new Intl.DateTimeFormat("pt-BR", {
//     day: "2-digit",
//     month: "short",
//     year: "numeric",
//   });

//   return `${fmt.format(from)} — ${fmt.format(to)}`;
// }

// function percent(part: number, total: number): number {
//   if (!total || total <= 0) return 0;
//   return (part / total) * 100;
// }

// function toInputDate(d: Date): string {
//   return d.toISOString().slice(0, 10); // yyyy-MM-dd
// }

// const WEALTH_RANGE_STORAGE_KEY = (userId: string) =>
//   `wealthhub:date-range:${userId}`;

// // valida "YYYY-MM-DD" e garante que o dia existe naquele mês/ano
// function isValidDateInput(value: string): boolean {
//   if (!value) return false;

//   const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
//   if (!match) return false;

//   const year = Number(match[1]);
//   const month = Number(match[2]); // 1-12
//   const day = Number(match[3]);   // 1-31

//   if (year < 1970 || year > 2100) return false;
//   if (month < 1 || month > 12) return false;
//   if (day < 1 || day > 31) return false;

//   const monthLengths = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

//   const isLeapYear =
//     (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;

//   if (month === 2) {
//     const maxDay = isLeapYear ? 29 : 28;
//     if (day > maxDay) return false;
//   } else {
//     const maxDay = monthLengths[month - 1];
//     if (day > maxDay) return false;
//   }

//   return true;
// }

// // ===== Hook que chama sua API =====
// function useWealthOverview(userId: string, from: string, to: string) {
//   const [data, setData] = React.useState<WealthOverview | null>(null);
//   const [loading, setLoading] = React.useState(true);
//   const [error, setError] = React.useState<string | null>(null);
//   const [lastUpdated, setLastUpdated] = React.useState<string | null>(null);

//   React.useEffect(() => {
//     if (!userId || !from || !to) return;

//     let cancelled = false;
//     setLoading(true);
//     setError(null);

//     async function fetchAll() {
//       try {
//         console.log("[WealthHub] Fetch iniciando", { userId, from, to });

//         // 1) posições + fx
//         const positionsUrl = `/investment-transactions/investment-transactions/positions-with-fx/${userId}`;
//         console.log("[WealthHub] GET", positionsUrl);
//         const positionsPromise = api<PositionsResponse>(positionsUrl, {
//           method: "GET",
//         });

//         // 2) resumo do dashboard com range de datas
//         const params = new URLSearchParams({
//           userId,
//           from, // yyyy-MM-dd
//           to,   // yyyy-MM-dd
//         });
//         const summaryUrl = `/dashboard/summary?${params.toString()}`;
//         console.log("[WealthHub] GET", summaryUrl);

//         const summaryPromise = api<DashboardSummary>(summaryUrl, {
//           method: "GET",
//         });

//         const [positionsRes, summaryRes] = await Promise.all([
//           positionsPromise,
//           summaryPromise,
//         ]);

//         console.log("[WealthHub] Responses", {
//           positionsRes,
//           summaryRes,
//         });

//         if (cancelled) return;

//         setData({
//           positions: positionsRes.positions,
//           rates: positionsRes.rates,
//           period: summaryRes.period,
//           expenses: summaryRes.expenses,
//           installments: summaryRes.installments,
//         });
//         setLastUpdated(new Date().toISOString());
//       } catch (err) {
//         if (cancelled) return;
//         const msg =
//           err instanceof Error ? err.message : "Erro ao carregar Wealth Hub";
//         console.error("[WealthHub] Erro fetchAll", err);
//         setError(msg);
//       } finally {
//         if (!cancelled) setLoading(false);
//       }
//     }

//     fetchAll();

//     return () => {
//       cancelled = true;
//     };
//   }, [userId, from, to]);

//   return { data, loading, error, lastUpdated };
// }

// // ===== Componentes de UI simples =====
// function Card(props: {
//   title: string;
//   icon?: React.ReactNode;
//   children: React.ReactNode;
// }) {
//   return (
//     <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4 shadow-sm">
//       <div className="mb-3 flex items-center justify-between gap-2">
//         <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-300">
//           {props.title}
//         </h2>
//         {props.icon && <div className="text-zinc-400">{props.icon}</div>}
//       </div>
//       {props.children}
//     </div>
//   );
// }

// function ProgressBar(props: {
//   value: number;
//   labelLeft: string;
//   labelRight: string;
// }) {
//   const clamped = Math.max(0, Math.min(100, props.value));

//   return (
//     <div className="space-y-2">
//       <div className="flex items-center justify-between text-xs text-zinc-400">
//         <span>{props.labelLeft}</span>
//         <span>{props.labelRight}</span>
//       </div>
//       <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-800">
//         <div
//           className="h-full rounded-full bg-emerald-500"
//           style={{ width: `${clamped}%` }}
//         />
//       </div>
//     </div>
//   );
// }

// // ===== Página principal: Wealth Hub =====
// export default function WealthHubPage() {
//   const { data: session, isLoading: loadingSession } = useSession();
//   const userId = session?.user?.id ?? "";

//   // ===== Filtro de datas (range) =====
//   // padrão: ano vigente inteiro (01/01 até 31/12)
//   const year = React.useMemo(() => new Date().getFullYear(), []);
//   const yearStart = React.useMemo(() => new Date(year, 0, 1), [year]);
//   const yearEnd = React.useMemo(() => new Date(year, 11, 31), [year]);

//   // valores "aplicados" (usados na API)
//   const [from, setFrom] = React.useState<string>("");
//   const [to, setTo] = React.useState<string>("");

//   // valores que o usuário está digitando no input
//   const [fromInput, setFromInput] = React.useState<string>("");
//   const [toInputValue, setToInputValue] = React.useState<string>("");

//   // erro de data
//   const [dateError, setDateError] = React.useState<string | null>(null);

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
//           if (
//             parsed.from &&
//             parsed.to &&
//             isValidDateInput(parsed.from) &&
//             isValidDateInput(parsed.to)
//           ) {
//             initialFrom = parsed.from;
//             initialTo = parsed.to;
//           } else {
//             console.warn(
//               "[WealthHub] Date range inválido no localStorage, limpando",
//               parsed
//             );
//             window.localStorage.removeItem(key);
//           }
//         } catch {
//           window.localStorage.removeItem(key);
//         }
//       }
//     }

//     // se não tinha nada salvo ou era inválido, usa ano vigente
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
//     to
//   );

//   function applyDateRange() {
//     if (!fromInput || !toInputValue) return;

//     const fromOk = isValidDateInput(fromInput);
//     const toOk = isValidDateInput(toInputValue);

//     if (!fromOk || !toOk) {
//       setDateError("Data inválida. Verifique dia, mês e ano.");
//       console.warn("[WealthHub] Datas inválidas, não aplicando filtro", {
//         fromInput,
//         toInputValue,
//       });
//       return;
//     }

//     // garante que from <= to (se quiser, pode só setar erro em vez de reordenar)
//     if (new Date(fromInput) > new Date(toInputValue)) {
//       setDateError("A data inicial não pode ser maior que a final.");
//       console.warn("[WealthHub] from > to, não aplicando filtro", {
//         fromInput,
//         toInputValue,
//       });
//       return;
//     }

//     setDateError(null);

//     console.log("[WealthHub] Aplicar filtro", {
//       fromInput,
//       toInputValue,
//     });

//     setFrom(fromInput);
//     setTo(toInputValue);
//   }

//   console.log("[WealthHub] Render", {
//     userId,
//     from,
//     to,
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

//   return (
//     <div className="space-y-6">
//       {/* Header */}
//       <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
//         <div>
//           <h1 className="flex items-center gap-2 text-2xl font-bold text-zinc-50">
//             <Wallet className="h-6 w-6 text-emerald-400" />
//             Wealth Hub
//           </h1>
//           <p className="mt-1 text-sm text-zinc-400">
//             Visão consolidada do seu patrimônio, gastos e parcelas.
//           </p>

//           {rates && (
//             <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-zinc-500">
//               <span>
//                 BTC/USD:&nbsp;
//                 <span className="font-mono text-zinc-200">
//                   {new Intl.NumberFormat("en-US", {
//                     style: "currency",
//                     currency: "USD",
//                     maximumFractionDigits: 0,
//                   }).format(rates.btc_usd)}
//                 </span>
//               </span>
//               <span>
//                 BTC/BRL:&nbsp;
//                 <span className="font-mono text-zinc-200">
//                   {formatCurrencyBRL(rates.btc_brl)}
//                 </span>
//               </span>
//               <span>
//                 USD/BRL:&nbsp;
//                 <span className="font-mono text-zinc-200">
//                   {rates.usd_brl.toFixed(3)}
//                 </span>
//               </span>
//               {lastUpdated && (
//                 <span className="text-[10px] text-zinc-500">
//                   Atualizado em{" "}
//                   {new Date(lastUpdated).toLocaleTimeString("pt-BR")}
//                 </span>
//               )}
//             </div>
//           )}
//         </div>

//         {/* Filtro de datas */}
//         <div className="flex flex-col items-start gap-2 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-3 text-xs text-zinc-300 sm:flex-row sm:items-center sm:text-sm">
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
//                 onChange={(e) => {
//                   setFromInput(e.target.value);
//                   if (dateError) setDateError(null);
//                 }}
//                 className="rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs text-zinc-100 outline-none focus:border-emerald-500"
//               />
//             </label>
//             <span className="text-zinc-500">→</span>
//             <label className="flex items-center gap-1">
//               <span className="text-zinc-400">Até</span>
//               <input
//                 type="date"
//                 value={toInputValue}
//                 onChange={(e) => {
//                   setToInputValue(e.target.value);
//                   if (dateError) setDateError(null);
//                 }}
//                 className="rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs text-zinc-100 outline-none focus:border-emerald-500"
//               />
//             </label>
//             <button
//               type="button"
//               onClick={applyDateRange}
//               className="rounded-md border border-emerald-500 px-3 py-1 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/10 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
//               disabled={!!dateError}
//             >
//               Aplicar
//             </button>
//           </div>
//           <span className="text-[10px] text-zinc-500 sm:text-xs">
//             ({formatDateRange(period.from, period.to)})
//           </span>
//           {dateError && (
//             <span className="text-[10px] text-red-400 sm:text-xs">
//               {dateError}
//             </span>
//           )}
//         </div>
//       </header>

//       {/* Cards resumo */}
//       <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
//         <Card
//           title="Total Investido"
//           icon={<BarChart2 className="h-4 w-4 text-emerald-400" />}
//         >
//           <p className="text-2xl font-semibold text-zinc-50">
//             {formatCurrencyBRL(totalInvested)}
//           </p>
//           <p className="mt-1 text-xs text-zinc-400">
//             Somando todos os ativos cadastrados.
//           </p>
//         </Card>

//         <Card
//           title="Gastos no Período"
//           icon={<TrendingUp className="h-4 w-4 text-rose-400" />}
//         >
//           <p className="text-2xl font-semibold text-zinc-50">
//             {formatCurrencyBRL(expenses.total)}
//           </p>
//           <p className="mt-1 text-xs text-zinc-400">
//             Total de despesas entre as datas selecionadas.
//           </p>
//         </Card>

//         <Card
//           title="Parcelas"
//           icon={<CalendarRange className="h-4 w-4 text-sky-400" />}
//         >
//           <div className="mb-2 flex items-center justify-between text-sm">
//             <div className="flex items-center gap-1 text-emerald-400">
//               <CheckCircle2 className="h-4 w-4" />
//               <span>
//                 {installments.countPaid} pagas (
//                 {formatCurrencyBRL(installments.totalPaid)})
//               </span>
//             </div>
//           </div>

//           <div className="mb-3 flex items-center justify-between text-sm">
//             <div className="flex items-center gap-1 text-amber-300">
//               <Clock4 className="h-4 w-4" />
//               <span>
//                 {installments.countPending} pendentes (
//                 {formatCurrencyBRL(installments.totalPending)})
//               </span>
//             </div>
//           </div>

//           <ProgressBar
//             value={paidPercent}
//             labelLeft="Progresso de pagamento"
//             labelRight={`${paidPercent.toFixed(0)}%`}
//           />
//         </Card>
//       </section>

//       {/* Grid principal */}
//       <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
//         {/* Tabela de posições */}
//         <Card
//           title="Posições"
//           icon={<BarChart2 className="h-4 w-4 text-zinc-300" />}
//         >
//           {positions.length === 0 ? (
//             <p className="text-sm text-zinc-400">
//               Nenhum ativo cadastrado ainda.
//             </p>
//           ) : (
//             <div className="overflow-x-auto">
//               <table className="min-w-full text-sm">
//                 <thead>
//                   <tr className="border-b border-zinc-800 text-zinc-400">
//                     <th className="py-2 pr-3 text-left font-medium">Ativo</th>
//                     <th className="px-3 py-2 text-right font-medium">
//                       Quantidade
//                     </th>
//                     <th className="px-3 py-2 text-right font-medium">
//                       Investido
//                     </th>
//                     <th className="pl-3 py-2 text-right font-medium">
//                       Preço Médio (BRL)
//                     </th>
//                   </tr>
//                 </thead>
//                 <tbody>
//                   {positions.map((pos) => (
//                     <tr
//                       key={pos.assetId}
//                       className="border-b border-zinc-900/60 last:border-0"
//                     >
//                       <td className="py-2 pr-3">
//                         <div className="flex flex-col">
//                           <span className="font-medium uppercase text-zinc-50">
//                             {pos.name}
//                           </span>
//                           <span className="text-xs text-zinc-500">
//                             {pos.type === "crypto" ? "Cripto" : pos.type}
//                           </span>
//                         </div>
//                       </td>
//                       <td className="px-3 py-2 text-right text-zinc-100">
//                         {pos.quantity}
//                       </td>
//                       <td className="px-3 py-2 text-right text-zinc-100">
//                         {formatCurrencyBRL(pos.invested)}
//                       </td>
//                       <td className="pl-3 py-2 text-right text-zinc-100">
//                         {pos.averagePriceBRL
//                           ? formatCurrencyBRL(Number(pos.averagePriceBRL))
//                           : formatCurrencyBRL(pos.averagePrice)}
//                       </td>
//                     </tr>
//                   ))}
//                 </tbody>
//               </table>
//             </div>
//           )}
//         </Card>

//         {/* Coluna direita */}
//         <div className="space-y-4 lg:col-span-2">
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
//     </div>
//   );


// import React from "react";
// import { useSession } from "../lib/useSession";
// import { api } from "../lib/http";
// import {
//   Wallet,
//   BarChart2,
//   CalendarRange,
//   TrendingUp,
//   CheckCircle2,
//   Clock4,
// } from "lucide-react";

// // ===== Tipos vindos da API =====
// type Position = {
//   assetId: string;
//   name: string;
//   type: "crypto" | "stock" | "fiat" | string;
//   quantity: number;
//   invested: number;
//   averagePrice: number;
//   averagePriceBRL?: string;
//   averagePriceUSD?: string;
// };

// type Rates = {
//   btc_usd: number;
//   btc_brl: number;
//   usd_brl: number;
//   source: string;
//   fetchedAt: string;
// };

// type PositionsResponse = {
//   positions: Position[];
//   rates: Rates;
// };

// type DashboardSummary = {
//   period: {
//     from: string; // ISO
//     to: string; // ISO
//   };
//   expenses: {
//     total: number;
//   };
//   installments: {
//     totalPaid: number;
//     totalPending: number;
//     countPaid: number;
//     countPending: number;
//   };
// };

// type WealthOverview = {
//   positions: Position[];
//   rates: Rates;
//   period: DashboardSummary["period"];
//   expenses: DashboardSummary["expenses"];
//   installments: DashboardSummary["installments"];
// };

// // ===== Helpers =====
// function formatCurrencyBRL(value: number) {
//   return new Intl.NumberFormat("pt-BR", {
//     style: "currency",
//     currency: "BRL",
//     maximumFractionDigits: 2,
//   }).format(value);
// }

// function formatDateRange(fromISO: string, toISO: string) {
//   const from = new Date(fromISO);
//   const to = new Date(toISO);

//   const fmt = new Intl.DateTimeFormat("pt-BR", {
//     day: "2-digit",
//     month: "short",
//     year: "numeric",
//   });

//   return `${fmt.format(from)} — ${fmt.format(to)}`;
// }

// function percent(part: number, total: number): number {
//   if (!total || total <= 0) return 0;
//   return (part / total) * 100;
// }

// function toInputDate(d: Date): string {
//   return d.toISOString().slice(0, 10); // yyyy-MM-dd
// }

// const WEALTH_RANGE_STORAGE_KEY = (userId: string) =>
//   `wealthhub:date-range:${userId}`;

// // ===== Hook que chama sua API =====
// function useWealthOverview(userId: string, from: string, to: string) {
//   const [data, setData] = React.useState<WealthOverview | null>(null);
//   const [loading, setLoading] = React.useState(true);
//   const [error, setError] = React.useState<string | null>(null);
//   const [lastUpdated, setLastUpdated] = React.useState<string | null>(null);

//   React.useEffect(() => {
//     if (!userId || !from || !to) return;

//     let cancelled = false;
//     setLoading(true);
//     setError(null);

//     async function fetchAll() {
//       try {
//         console.log("[WealthHub] Fetch iniciando", { userId, from, to });

//         // 1) posições + fx
//         const positionsUrl = `/investment-transactions/investment-transactions/positions-with-fx/${userId}`;
//         console.log("[WealthHub] GET", positionsUrl);
//         const positionsPromise = api<PositionsResponse>(positionsUrl, {
//           method: "GET",
//         });

//         // 2) resumo do dashboard com range de datas
//         const params = new URLSearchParams({
//           userId,
//           from, // yyyy-MM-dd
//           to, // yyyy-MM-dd
//         });
//         const summaryUrl = `/dashboard/summary?${params.toString()}`;
//         console.log("[WealthHub] GET", summaryUrl);

//         const summaryPromise = api<DashboardSummary>(summaryUrl, {
//           method: "GET",
//         });

//         const [positionsRes, summaryRes] = await Promise.all([
//           positionsPromise,
//           summaryPromise,
//         ]);

//         console.log("[WealthHub] Responses", {
//           positionsRes,
//           summaryRes,
//         });

//         if (cancelled) return;

//         setData({
//           positions: positionsRes.positions,
//           rates: positionsRes.rates,
//           period: summaryRes.period,
//           expenses: summaryRes.expenses,
//           installments: summaryRes.installments,
//         });
//         setLastUpdated(new Date().toISOString());
//       } catch (err) {
//         if (cancelled) return;
//         const msg =
//           err instanceof Error ? err.message : "Erro ao carregar Wealth Hub";
//         console.error("[WealthHub] Erro fetchAll", err);
//         setError(msg);
//       } finally {
//         if (!cancelled) setLoading(false);
//       }
//     }

//     fetchAll();

//     return () => {
//       cancelled = true;
//     };
//   }, [userId, from, to]);

//   return { data, loading, error, lastUpdated };
// }

// // ===== Componentes de UI simples =====
// function Card(props: {
//   title: string;
//   icon?: React.ReactNode;
//   children: React.ReactNode;
// }) {
//   return (
//     <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4 shadow-sm">
//       <div className="mb-3 flex items-center justify-between gap-2">
//         <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-300">
//           {props.title}
//         </h2>
//         {props.icon && <div className="text-zinc-400">{props.icon}</div>}
//       </div>
//       {props.children}
//     </div>
//   );
// }

// function ProgressBar(props: {
//   value: number;
//   labelLeft: string;
//   labelRight: string;
// }) {
//   const clamped = Math.max(0, Math.min(100, props.value));

//   return (
//     <div className="space-y-2">
//       <div className="flex items-center justify-between text-xs text-zinc-400">
//         <span>{props.labelLeft}</span>
//         <span>{props.labelRight}</span>
//       </div>
//       <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-800">
//         <div
//           className="h-full rounded-full bg-emerald-500"
//           style={{ width: `${clamped}%` }}
//         />
//       </div>
//     </div>
//   );
// }

// // ===== Página principal: Wealth Hub =====
// export default function WealthHubPage() {
//   const { data: session, isLoading: loadingSession } = useSession();
//   const userId = session?.user?.id ?? "";

//   // ===== Filtro de datas (range) =====
//   // padrão: ano vigente inteiro (01/01 até 31/12)
//   const year = React.useMemo(() => new Date().getFullYear(), []);
//   const yearStart = React.useMemo(() => new Date(year, 0, 1), [year]);
//   const yearEnd = React.useMemo(() => new Date(year, 11, 31), [year]);

//   // valores "aplicados" (usados na API)
//   const [from, setFrom] = React.useState<string>("");
//   const [to, setTo] = React.useState<string>("");

//   // valores que o usuário está digitando no input
//   const [fromInput, setFromInput] = React.useState<string>("");
//   const [toInputValue, setToInputValue] = React.useState<string>("");

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
//           }
//         } catch {
//           // se der erro no parse, ignora e usa o padrão do ano
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
//     to
//   );

//   function applyDateRange() {
//     if (!fromInput || !toInputValue) return;
//     console.log("[WealthHub] Aplicar filtro", {
//       fromInput,
//       toInputValue,
//     });
//     setFrom(fromInput);
//     setTo(toInputValue);
//   }

//   console.log("[WealthHub] Render", {
//     userId,
//     from,
//     to,
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

//   return (
//     <div className="space-y-6">
//       {/* Header */}
//       <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
//         <div>
//           <h1 className="flex items-center gap-2 text-2xl font-bold text-zinc-50">
//             <Wallet className="h-6 w-6 text-emerald-400" />
//             Wealth Hub
//           </h1>
//           <p className="mt-1 text-sm text-zinc-400">
//             Visão consolidada do seu patrimônio, gastos e parcelas.
//           </p>

//           {rates && (
//             <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-zinc-500">
//               <span>
//                 BTC/USD:&nbsp;
//                 <span className="font-mono text-zinc-200">
//                   {new Intl.NumberFormat("en-US", {
//                     style: "currency",
//                     currency: "USD",
//                     maximumFractionDigits: 0,
//                   }).format(rates.btc_usd)}
//                 </span>
//               </span>
//               <span>
//                 BTC/BRL:&nbsp;
//                 <span className="font-mono text-zinc-200">
//                   {formatCurrencyBRL(rates.btc_brl)}
//                 </span>
//               </span>
//               <span>
//                 USD/BRL:&nbsp;
//                 <span className="font-mono text-zinc-200">
//                   {rates.usd_brl.toFixed(3)}
//                 </span>
//               </span>
//               {lastUpdated && (
//                 <span className="text-[10px] text-zinc-500">
//                   Atualizado em{" "}
//                   {new Date(lastUpdated).toLocaleTimeString("pt-BR")}
//                 </span>
//               )}
//             </div>
//           )}
//         </div>

//         {/* Filtro de datas */}
//         <div className="flex flex-col items-start gap-2 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-3 text-xs text-zinc-300 sm:flex-row sm:items-center sm:text-sm">
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
//           <span className="text-[10px] text-zinc-500 sm:text-xs">
//             ({formatDateRange(period.from, period.to)})
//           </span>
//         </div>
//       </header>

//       {/* Cards resumo */}
//       <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
//         <Card
//           title="Total Investido"
//           icon={<BarChart2 className="h-4 w-4 text-emerald-400" />}
//         >
//           <p className="text-2xl font-semibold text-zinc-50">
//             {formatCurrencyBRL(totalInvested)}
//           </p>
//           <p className="mt-1 text-xs text-zinc-400">
//             Somando todos os ativos cadastrados.
//           </p>
//         </Card>

//         <Card
//           title="Gastos no Período"
//           icon={<TrendingUp className="h-4 w-4 text-rose-400" />}
//         >
//           <p className="text-2xl font-semibold text-zinc-50">
//             {formatCurrencyBRL(expenses.total)}
//           </p>
//           <p className="mt-1 text-xs text-zinc-400">
//             Total de despesas entre as datas selecionadas.
//           </p>
//         </Card>

//         <Card
//           title="Parcelas"
//           icon={<CalendarRange className="h-4 w-4 text-sky-400" />}
//         >
//           <div className="mb-2 flex items-center justify-between text-sm">
//             <div className="flex items-center gap-1 text-emerald-400">
//               <CheckCircle2 className="h-4 w-4" />
//               <span>
//                 {installments.countPaid} pagas (
//                 {formatCurrencyBRL(installments.totalPaid)})
//               </span>
//             </div>
//           </div>

//           <div className="mb-3 flex items-center justify-between text-sm">
//             <div className="flex items-center gap-1 text-amber-300">
//               <Clock4 className="h-4 w-4" />
//               <span>
//                 {installments.countPending} pendentes (
//                 {formatCurrencyBRL(installments.totalPending)})
//               </span>
//             </div>
//           </div>

//           <ProgressBar
//             value={paidPercent}
//             labelLeft="Progresso de pagamento"
//             labelRight={`${paidPercent.toFixed(0)}%`}
//           />
//         </Card>
//       </section>

//       {/* Grid principal */}
//       <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
//         {/* Tabela de posições */}
//         <Card
//           title="Posições"
//           icon={<BarChart2 className="h-4 w-4 text-zinc-300" />}
//         >
//           {positions.length === 0 ? (
//             <p className="text-sm text-zinc-400">
//               Nenhum ativo cadastrado ainda.
//             </p>
//           ) : (
//             <div className="overflow-x-auto">
//               <table className="min-w-full text-sm">
//                 <thead>
//                   <tr className="border-b border-zinc-800 text-zinc-400">
//                     <th className="py-2 pr-3 text-left font-medium">Ativo</th>
//                     <th className="px-3 py-2 text-right font-medium">
//                       Quantidade
//                     </th>
//                     <th className="px-3 py-2 text-right font-medium">
//                       Investido
//                     </th>
//                     <th className="pl-3 py-2 text-right font-medium">
//                       Preço Médio (BRL)
//                     </th>
//                   </tr>
//                 </thead>
//                 <tbody>
//                   {positions.map((pos) => (
//                     <tr
//                       key={pos.assetId}
//                       className="border-b border-zinc-900/60 last:border-0"
//                     >
//                       <td className="py-2 pr-3">
//                         <div className="flex flex-col">
//                           <span className="font-medium uppercase text-zinc-50">
//                             {pos.name}
//                           </span>
//                           <span className="text-xs text-zinc-500">
//                             {pos.type === "crypto" ? "Cripto" : pos.type}
//                           </span>
//                         </div>
//                       </td>
//                       <td className="px-3 py-2 text-right text-zinc-100">
//                         {pos.quantity}
//                       </td>
//                       <td className="px-3 py-2 text-right text-zinc-100">
//                         {formatCurrencyBRL(pos.invested)}
//                       </td>
//                       <td className="pl-3 py-2 text-right text-zinc-100">
//                         {pos.averagePriceBRL
//                           ? formatCurrencyBRL(Number(pos.averagePriceBRL))
//                           : formatCurrencyBRL(pos.averagePrice)}
//                       </td>
//                     </tr>
//                   ))}
//                 </tbody>
//               </table>
//             </div>
//           )}
//         </Card>

//         {/* Coluna direita */}
//         <div className="space-y-4 lg:col-span-2">
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
//     </div>
//   );
// }


// import React from "react";
// import { useSession } from "../lib/useSession";
// import { api } from "../lib/http";
// import {
//   Wallet,
//   BarChart2,
//   CalendarRange,
//   TrendingUp,
//   CheckCircle2,
//   Clock4,
// } from "lucide-react";

// // ===== Tipos vindos da API =====
// type Position = {
//   assetId: string;
//   name: string;
//   type: "crypto" | "stock" | "fiat" | string;
//   quantity: number;
//   invested: number;
//   averagePrice: number;
//   averagePriceBRL?: string;
//   averagePriceUSD?: string;
// };

// type Rates = {
//   btc_usd: number;
//   btc_brl: number;
//   usd_brl: number;
//   source: string;
//   fetchedAt: string;
// };

// type PositionsResponse = {
//   positions: Position[];
//   rates: Rates;
// };

// type DashboardSummary = {
//   period: {
//     from: string; // ISO
//     to: string;   // ISO
//   };
//   expenses: {
//     total: number;
//   };
//   installments: {
//     totalPaid: number;
//     totalPending: number;
//     countPaid: number;
//     countPending: number;
//   };
// };

// type WealthOverview = {
//   positions: Position[];
//   rates: Rates;
//   period: DashboardSummary["period"];
//   expenses: DashboardSummary["expenses"];
//   installments: DashboardSummary["installments"];
// };

// // ===== Helpers =====
// function formatCurrencyBRL(value: number) {
//   return new Intl.NumberFormat("pt-BR", {
//     style: "currency",
//     currency: "BRL",
//     maximumFractionDigits: 2,
//   }).format(value);
// }

// function formatDateRange(fromISO: string, toISO: string) {
//   const from = new Date(fromISO);
//   const to = new Date(toISO);

//   const fmt = new Intl.DateTimeFormat("pt-BR", {
//     day: "2-digit",
//     month: "short",
//     year: "numeric",
//   });

//   return `${fmt.format(from)} — ${fmt.format(to)}`;
// }

// function percent(part: number, total: number): number {
//   if (!total || total <= 0) return 0;
//   return (part / total) * 100;
// }

// function toInputDate(d: Date): string {
//   return d.toISOString().slice(0, 10); // yyyy-MM-dd
// }

// // ===== Hook que chama sua API =====
// function useWealthOverview(userId: string, from: string, to: string) {
//   const [data, setData] = React.useState<WealthOverview | null>(null);
//   const [loading, setLoading] = React.useState(true);
//   const [error, setError] = React.useState<string | null>(null);
//   const [lastUpdated, setLastUpdated] = React.useState<string | null>(null);

//   React.useEffect(() => {
//     if (!userId || !from || !to) return;

//     let cancelled = false;
//     setLoading(true);
//     setError(null);

//     async function fetchAll() {
//       try {
//         console.log("[WealthHub] Fetch iniciando", { userId, from, to });

//         // 1) posições + fx
//         const positionsUrl = `/investment-transactions/investment-transactions/positions-with-fx/${userId}`;
//         console.log("[WealthHub] GET", positionsUrl);
//         const positionsPromise = api<PositionsResponse>(positionsUrl, {
//           method: "GET",
//         });

//         // 2) resumo do dashboard com range de datas
//         const params = new URLSearchParams({
//           userId,
//           operationType: "purchase",
//           from, // yyyy-MM-dd
//           to,   // yyyy-MM-dd
//         });
//         const summaryUrl = `/dashboard/summary?${params.toString()}`;
//         console.log("[WealthHub] GET", summaryUrl);

//         const summaryPromise = api<DashboardSummary>(summaryUrl, {
//           method: "GET",
//         });

//         const [positionsRes, summaryRes] = await Promise.all([
//           positionsPromise,
//           summaryPromise,
//         ]);

//         console.log("[WealthHub] Responses", {
//           positionsRes,
//           summaryRes,
//         });

//         if (cancelled) return;

//         setData({
//           positions: positionsRes.positions,
//           rates: positionsRes.rates,
//           period: summaryRes.period,
//           expenses: summaryRes.expenses,
//           installments: summaryRes.installments,
//         });
//         setLastUpdated(new Date().toISOString());
//       } catch (err) {
//         if (cancelled) return;
//         const msg =
//           err instanceof Error ? err.message : "Erro ao carregar Wealth Hub";
//         console.error("[WealthHub] Erro fetchAll", err);
//         setError(msg);
//       } finally {
//         if (!cancelled) setLoading(false);
//       }
//     }

//     fetchAll();

//     return () => {
//       cancelled = true;
//     };
//   }, [userId, from, to]);

//   return { data, loading, error, lastUpdated };
// }

// // ===== Componentes de UI simples =====
// function Card(props: {
//   title: string;
//   icon?: React.ReactNode;
//   children: React.ReactNode;
// }) {
//   return (
//     <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4 shadow-sm">
//       <div className="mb-3 flex items-center justify-between gap-2">
//         <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-300">
//           {props.title}
//         </h2>
//         {props.icon && <div className="text-zinc-400">{props.icon}</div>}
//       </div>
//       {props.children}
//     </div>
//   );
// }

// function ProgressBar(props: {
//   value: number;
//   labelLeft: string;
//   labelRight: string;
// }) {
//   const clamped = Math.max(0, Math.min(100, props.value));

//   return (
//     <div className="space-y-2">
//       <div className="flex items-center justify-between text-xs text-zinc-400">
//         <span>{props.labelLeft}</span>
//         <span>{props.labelRight}</span>
//       </div>
//       <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-800">
//         <div
//           className="h-full rounded-full bg-emerald-500"
//           style={{ width: `${clamped}%` }}
//         />
//       </div>
//     </div>
//   );
// }

// // ===== Página principal: Wealth Hub =====
// export default function WealthHubPage() {
//   const { data: session, isLoading: loadingSession } = useSession();
//   const userId = session?.user?.id ?? "";

//   // ===== Filtro de datas (range) =====
//   // padrão: ano vigente inteiro (01/01 até 31/12)
//   const year = React.useMemo(() => new Date().getFullYear(), []);
//   const yearStart = React.useMemo(() => new Date(year, 0, 1), [year]);
//   const yearEnd = React.useMemo(() => new Date(year, 11, 31), [year]);

//   // valores "aplicados" (usados na API)
//   const [from, setFrom] = React.useState<string>(toInputDate(yearStart));
//   const [to, setTo] = React.useState<string>(toInputDate(yearEnd));

//   // valores que o usuário está digitando no input
//   const [fromInput, setFromInput] = React.useState<string>(toInputDate(yearStart));
//   const [toInputValue, setToInputValue] = React.useState<string>(toInputDate(yearEnd));

//   const { data, loading, error, lastUpdated } = useWealthOverview(userId, from, to);

//   function applyDateRange() {
//     if (!fromInput || !toInputValue) return;
//     console.log("[WealthHub] Aplicar filtro", {
//       fromInput,
//       toInputValue,
//     });
//     setFrom(fromInput);
//     setTo(toInputValue);
//   }

//   console.log("[WealthHub] Render", {
//     userId,
//     from,
//     to,
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

//   return (
//     <div className="space-y-6">
//       {/* Header */}
//       <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
//         <div>
//           <h1 className="flex items-center gap-2 text-2xl font-bold text-zinc-50">
//             <Wallet className="h-6 w-6 text-emerald-400" />
//             Wealth Hub
//           </h1>
//           <p className="mt-1 text-sm text-zinc-400">
//             Visão consolidada do seu patrimônio, gastos e parcelas.
//           </p>

//           {rates && (
//             <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-zinc-500">
//               <span>
//                 BTC/USD:&nbsp;
//                 <span className="font-mono text-zinc-200">
//                   {new Intl.NumberFormat("en-US", {
//                     style: "currency",
//                     currency: "USD",
//                     maximumFractionDigits: 0,
//                   }).format(rates.btc_usd)}
//                 </span>
//               </span>
//               <span>
//                 BTC/BRL:&nbsp;
//                 <span className="font-mono text-zinc-200">
//                   {formatCurrencyBRL(rates.btc_brl)}
//                 </span>
//               </span>
//               <span>
//                 USD/BRL:&nbsp;
//                 <span className="font-mono text-zinc-200">
//                   {rates.usd_brl.toFixed(3)}
//                 </span>
//               </span>
//               {lastUpdated && (
//                 <span className="text-[10px] text-zinc-500">
//                   Atualizado em{" "}
//                   {new Date(lastUpdated).toLocaleTimeString("pt-BR")}
//                 </span>
//               )}
//             </div>
//           )}
//         </div>

//         {/* Filtro de datas */}
//         <div className="flex flex-col items-start gap-2 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-3 text-xs text-zinc-300 sm:flex-row sm:items-center sm:text-sm">
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
//           <span className="text-[10px] text-zinc-500 sm:text-xs">
//             ({formatDateRange(period.from, period.to)})
//           </span>
//         </div>
//       </header>

//       {/* Cards resumo */}
//       <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
//         <Card
//           title="Total Investido"
//           icon={<BarChart2 className="h-4 w-4 text-emerald-400" />}
//         >
//           <p className="text-2xl font-semibold text-zinc-50">
//             {formatCurrencyBRL(totalInvested)}
//           </p>
//           <p className="mt-1 text-xs text-zinc-400">
//             Somando todos os ativos cadastrados.
//           </p>
//         </Card>

//         <Card
//           title="Gastos no Período"
//           icon={<TrendingUp className="h-4 w-4 text-rose-400" />}
//         >
//           <p className="text-2xl font-semibold text-zinc-50">
//             {formatCurrencyBRL(expenses.total)}
//           </p>
//           <p className="mt-1 text-xs text-zinc-400">
//             Total de despesas entre as datas selecionadas.
//           </p>
//         </Card>

//         <Card
//           title="Parcelas"
//           icon={<CalendarRange className="h-4 w-4 text-sky-400" />}
//         >
//           <div className="mb-2 flex items-center justify-between text-sm">
//             <div className="flex items-center gap-1 text-emerald-400">
//               <CheckCircle2 className="h-4 w-4" />
//               <span>
//                 {installments.countPaid} pagas (
//                 {formatCurrencyBRL(installments.totalPaid)})
//               </span>
//             </div>
//           </div>

//           <div className="mb-3 flex items-center justify-between text-sm">
//             <div className="flex items-center gap-1 text-amber-300">
//               <Clock4 className="h-4 w-4" />
//               <span>
//                 {installments.countPending} pendentes (
//                 {formatCurrencyBRL(installments.totalPending)})
//               </span>
//             </div>
//           </div>

//           <ProgressBar
//             value={paidPercent}
//             labelLeft="Progresso de pagamento"
//             labelRight={`${paidPercent.toFixed(0)}%`}
//           />
//         </Card>
//       </section>

//       {/* Grid principal */}
//       <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
//         {/* Tabela de posições */}
//         <Card
//           title="Posições"
//           icon={<BarChart2 className="h-4 w-4 text-zinc-300" />}
//         >
//           {positions.length === 0 ? (
//             <p className="text-sm text-zinc-400">
//               Nenhum ativo cadastrado ainda.
//             </p>
//           ) : (
//             <div className="overflow-x-auto">
//               <table className="min-w-full text-sm">
//                 <thead>
//                   <tr className="border-b border-zinc-800 text-zinc-400">
//                     <th className="py-2 pr-3 text-left font-medium">Ativo</th>
//                     <th className="px-3 py-2 text-right font-medium">
//                       Quantidade
//                     </th>
//                     <th className="px-3 py-2 text-right font-medium">
//                       Investido
//                     </th>
//                     <th className="pl-3 py-2 text-right font-medium">
//                       Preço Médio (BRL)
//                     </th>
//                   </tr>
//                 </thead>
//                 <tbody>
//                   {positions.map((pos) => (
//                     <tr
//                       key={pos.assetId}
//                       className="border-b border-zinc-900/60 last:border-0"
//                     >
//                       <td className="py-2 pr-3">
//                         <div className="flex flex-col">
//                           <span className="font-medium uppercase text-zinc-50">
//                             {pos.name}
//                           </span>
//                           <span className="text-xs text-zinc-500">
//                             {pos.type === "crypto" ? "Cripto" : pos.type}
//                           </span>
//                         </div>
//                       </td>
//                       <td className="px-3 py-2 text-right text-zinc-100">
//                         {pos.quantity}
//                       </td>
//                       <td className="px-3 py-2 text-right text-zinc-100">
//                         {formatCurrencyBRL(pos.invested)}
//                       </td>
//                       <td className="pl-3 py-2 text-right text-zinc-100">
//                         {pos.averagePriceBRL
//                           ? formatCurrencyBRL(Number(pos.averagePriceBRL))
//                           : formatCurrencyBRL(pos.averagePrice)}
//                       </td>
//                     </tr>
//                   ))}
//                 </tbody>
//               </table>
//             </div>
//           )}
//         </Card>

//         {/* Coluna direita */}
//         <div className="space-y-4 lg:col-span-2">
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
//     </div>
//   );
// }
