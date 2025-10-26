import React from "react";
import { Pencil, Save, X } from "lucide-react";
import type { TransactionEntity, TransactionType } from "../../features/transactions/types";

// =============================
// Utils locais (autossuficiente)
// =============================
function isoToLocalInput(iso: string) {
  try {
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  } catch {
    return "";
  }
}

function localInputToIso(local: string) {
  const d = new Date(local);
  return d.toISOString();
}

// =============================
// Tipos de props
// =============================
export type TransactionListProps = {
  items: TransactionEntity[];
  onSave: (id: string, changes: Partial<TransactionEntity>) => Promise<TransactionEntity>;
  onLocalUpdate?: (updated: TransactionEntity) => void;
  locale?: string; // ex: "pt-BR"
  currency?: string; // ex: "BRL"
};

// =============================
// Componente
// =============================
export default function TransactionList({
  items,
  onSave,
  onLocalUpdate,
  locale = "pt-BR",
  currency = "BRL",
}: TransactionListProps) {
  const [editing, setEditing] = React.useState<string | null>(null);
  const [form, setForm] = React.useState<Partial<TransactionEntity>>({});
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const fmt = React.useMemo(() => new Intl.NumberFormat(locale, { style: "currency", currency }), [locale, currency]);

  function startEdit(tx: TransactionEntity) {
    setEditing(tx.id);
    setForm({
      title: tx.title,
      amount: tx.amount,
      type: tx.type,
      date: tx.date,
      notes: tx.notes ?? undefined,
      categoryId: tx.categoryId,
    });
    setError(null);
  }

  function cancel() {
    setEditing(null);
    setForm({});
    setError(null);
  }

  async function save(id: string) {
    try {
      if (!id) return;
      setSaving(true);
      setError(null);

      // Normaliza payload (amount como string; date em ISO)
      const payload: Partial<TransactionEntity> = {
        ...form,
        amount: form.amount != null ? String(form.amount) : undefined,
        date: form.date ? new Date(form.date).toISOString() : undefined,
      };

      const updated = await onSave(id, payload);
      onLocalUpdate?.(updated);
      cancel();
    } catch (e: any) {
      setError(e?.message || "Falha ao salvar");
    } finally {
      setSaving(false);
    }
  }

  if (!items?.length) {
    return (
      <div className="rounded-2xl border border-zinc-700/40 bg-zinc-900 p-6 text-zinc-300">
        Nenhuma transação por aqui ainda.
      </div>
    );
  }

  return (
    <div className="mt-6 space-y-3">
      {items.map((tx) => {
        const isEditing = editing === tx.id;
        return (
          <div key={tx.id} className="rounded-2xl border border-zinc-700/40 bg-zinc-900 p-4">
            {!isEditing ? (
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-zinc-100 font-medium truncate">{tx.title}</p>
                  <p className="text-xs text-zinc-400">{new Date(tx.date).toLocaleString(locale)}</p>
                  {tx.notes && (
                    <p className="mt-1 text-xs text-zinc-400 line-clamp-2">{tx.notes}</p>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <span className={`tabular-nums font-semibold ${tx.type === "income" ? "text-emerald-400" : "text-rose-400"}`}>
                    {fmt.format(Number(tx.amount || 0))}
                  </span>
                  <button
                    className="inline-flex items-center gap-2 rounded-xl border border-zinc-700/60 bg-zinc-800 px-3 py-2 text-xs font-medium text-zinc-200 hover:bg-zinc-700"
                    onClick={() => startEdit(tx)}
                  >
                    <Pencil className="h-4 w-4" /> Editar
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
                <input
                  className="md:col-span-2 rounded-xl bg-zinc-800 border border-zinc-700/60 px-3 py-2 text-zinc-100"
                  placeholder="Título"
                  value={form.title ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                />

                <input
                  className="rounded-xl bg-zinc-800 border border-zinc-700/60 px-3 py-2 text-zinc-100"
                  placeholder="Valor (ex: 123.45)"
                  value={form.amount ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                />

                <select
                  className="rounded-xl bg-zinc-800 border border-zinc-700/60 px-3 py-2 text-zinc-100"
                  value={(form.type as TransactionType) ?? "income"}
                  onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as TransactionType }))}
                >
                  <option value="income">Entrada</option>
                  <option value="expense">Saída</option>
                </select>

                <input
                  type="datetime-local"
                  className="rounded-xl bg-zinc-800 border border-zinc-700/60 px-3 py-2 text-zinc-100"
                  value={isoToLocalInput(form.date ?? new Date().toISOString())}
                  onChange={(e) => setForm((f) => ({ ...f, date: localInputToIso(e.target.value) }))}
                />

                <div className="flex items-center gap-2">
                  <button
                    disabled={saving}
                    onClick={() => save(editing!)}
                    className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2 font-semibold text-emerald-950 hover:brightness-95 disabled:opacity-50"
                  >
                    <Save className="h-4 w-4" /> {saving ? "Salvando…" : "Salvar"}
                  </button>
                  <button
                    disabled={saving}
                    onClick={cancel}
                    className="inline-flex items-center gap-2 rounded-xl border border-zinc-700/60 bg-zinc-800 px-4 py-2 font-semibold text-zinc-200 hover:bg-zinc-700"
                  >
                    <X className="h-4 w-4" /> Cancelar
                  </button>
                </div>

                {error && <p className="md:col-span-6 text-sm text-rose-400">{error}</p>}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
