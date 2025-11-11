import React from "react";
import { useSession } from "../lib/useSession";
import { useBalance } from "../features/users/hooks";
import { useCreateTransaction } from "../features/transactions/mutations";
import type { ICreateTransactionPayload, TransactionType } from "../features/transactions/types";
import MiniBalanceCard from "../components/MiniBalanceCard";
import CreateTransactionModal from "../components/transactions/CreateTransactionModal";
import { DollarSign, Bitcoin, Wallet, Plus, Send } from "lucide-react";

const DEFAULT_CATEGORY_ID =
  import.meta.env.VITE_DEFAULT_CATEGORY_ID ?? "2db3bf90-d8e9-45de-b1d1-8e8ab9c749dd";

const BTC_ORANGE = "#f7931a";
const USD_GREEN = "#16a34a";
const BRL_BLUE = "#3b82f6";

function formatCurrency(amount: number, currency: "BRL" | "USD") {
  return new Intl.NumberFormat(currency === "BRL" ? "pt-BR" : "en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(amount);
}
function formatBTC(btc: number) {
  const abs = Math.abs(btc);
  const frac = abs >= 0.01 ? 6 : 8;
  return `${btc.toLocaleString("en-US", {
    minimumFractionDigits: Math.min(frac, 8),
    maximumFractionDigits: Math.min(frac, 8),
  })} BTC`;
}

export default function DashboardPage() {
  const { data: session, isLoading: loadingSession } = useSession();
  const userId = session?.user?.id ?? "";

  const { data, isFetching: fetchingBalance, refetch } = useBalance(userId, {
    enabled: !!userId,
  });

  const brl = Number(data?.balance?.brl ?? 0);
  const usd = Number(data?.balance?.usd ?? 0);
  const btc = Number(data?.balance?.btc ?? 0);
  const rates = data?.balance?.rates;

  const createTx = useCreateTransaction(userId);

  // === Estado do modal ===
  const [createOpen, setCreateOpen] = React.useState(false);
  const [prefillType, setPrefillType] = React.useState<TransactionType>("income");

  function openCreate(type: TransactionType) {
    if (!userId) return;
    setPrefillType(type);
    setCreateOpen(true);
  }

  async function onCreate(payload: ICreateTransactionPayload) {
    const enriched = { ...payload, categoryId: payload.categoryId ?? DEFAULT_CATEGORY_ID };
    await createTx.mutateAsync(enriched);
    await refetch();
  }

  const handleRefresh = async () => {
    await refetch();
  };

  if (loadingSession) return <div className="p-6 text-zinc-200">Carregando sessão…</div>;
  if (!userId) return <div className="p-6 text-zinc-200">Você precisa entrar.</div>;

  return (
    <div className="grid gap-6">
      {/* Botões principais */}
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => openCreate("income")}
          className="inline-flex items-center gap-2 rounded-2xl px-4 py-2 font-semibold text-white shadow-sm active:scale-[0.99]"
          style={{ backgroundColor: BRL_BLUE }}
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

      {/* Cards compactos */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <MiniBalanceCard
          icon={<Wallet className="h-4 w-4" />}
          title="Saldo em Reais"
          primary={formatCurrency(brl, "BRL")}
          subtitle={rates ? `1 BTC = ${formatCurrency(rates.btc_brl ?? 0, "BRL")}` : undefined}
          accentHex={BRL_BLUE}
          loading={fetchingBalance}
          onRefresh={handleRefresh}
        />
        <MiniBalanceCard
          icon={<DollarSign className="h-4 w-4" />}
          title="Saldo em Dólares"
          primary={formatCurrency(usd, "USD")}
          subtitle={rates ? `BRL/USD ≈ ${(rates.brl_usd ?? 0).toFixed(3)}` : undefined}
          accentHex={USD_GREEN}
          loading={fetchingBalance}
          onRefresh={handleRefresh}
        />
        <MiniBalanceCard
          icon={<Bitcoin className="h-4 w-4" />}
          title="Saldo em Bitcoin"
          primary={formatBTC(btc)}
          subtitle={
            rates
              ? `BTC/USD ≈ ${new Intl.NumberFormat("en-US", {
                  style: "currency",
                  currency: "USD",
                }).format(rates.btc_usd ?? 0)}`
              : undefined
          }
          accentHex={BTC_ORANGE}
          loading={fetchingBalance}
          onRefresh={handleRefresh}
        />
      </div>

      {/* Modal de transação */}
      <CreateTransactionModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        defaultType={prefillType}
        userId={userId}
        defaultCategoryId={DEFAULT_CATEGORY_ID}
        onCreate={onCreate}
      />
    </div>
  );
}
