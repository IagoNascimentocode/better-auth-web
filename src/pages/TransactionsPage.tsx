// src/pages/TransactionsPage.tsx
import React from "react";
import type { TransactionEntity } from "../features/transactions/types";
import { listTransactions, updateTransaction } from "../features/transactions/api";
import TransactionList from "../components/transactions/TransactionList";
import { useSession } from "../lib/useSession";


export default function TransactionsPage() {
  const { data: session, isLoading: loadingSession } = useSession();
  const userId = session?.user?.id;
  const [items, setItems] = React.useState<TransactionEntity[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    (async () => {
      try {
        const data = await listTransactions(userId);
        setItems(data);
      } catch (e: any) {
        setError(e?.message || "Falha ao carregar");
      } finally {
        setLoading(false);
      }
    })();
  }, [userId]);

  async function onSave(id: string, changes: Partial<TransactionEntity>) {
    const updated = await updateTransaction(id, {
      title: changes.title,
      amount: changes.amount,
      type: changes.type as any,
      date: changes.date,
      notes: changes.notes ?? undefined,
      categoryId: changes.categoryId,
    });
    return updated;
  }

  if (loading) return <p>Carregando…</p>;
  if (error) return <p className="text-rose-400">{error}</p>;

  return (
    <div>
      <h1 className="text-xl font-semibold mb-4">Transações</h1>
      <TransactionList
        items={items}
        onSave={onSave}
        onLocalUpdate={(updated) =>
          setItems((arr) => arr.map((t) => (t.id === updated.id ? updated : t)))
        }
      />
    </div>
  );
}
