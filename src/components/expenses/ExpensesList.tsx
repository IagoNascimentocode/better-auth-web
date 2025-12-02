import React from "react";
import { Pencil, Save, X } from "lucide-react";
import type { ExpenseEntity } from "../../features/expenses/types";

// =============================
// Utils de data
// =============================
function isoToLocalInput(iso: string) {
  try {
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(
      d.getDate()
    )}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  } catch {
    return "";
  }
}

function localInputToIso(local: string) {
  return new Date(local).toISOString();
}

// =============================
// Types
// =============================
export type ExpensesListProps = {
  items: ExpenseEntity[];
  onSave: (
    id: string,
    changes: Partial<ExpenseEntity>
  ) => Promise<ExpenseEntity>;
  onLocalUpdate?: (updated: ExpenseEntity) => void;
  locale?: string;
  currency?: string;
};

// =============================
// Componente principal
// =============================
export default function ExpensesList({
  items,
  onSave,
  onLocalUpdate,
  locale = "pt-BR",
  currency = "BRL",
}: ExpensesListProps) {
  const [editing, setEditing] = React.useState<string | null>(null);
  const [form, setForm] = React.useState<Partial<ExpenseEntity>>({});
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const fmt = React.useMemo(
    () => new Intl.NumberFormat(locale, { style: "currency", currency }),
    [locale, currency]
  );

  // =============================
  // Iniciar edição
  // =============================
  function startEdit(exp: ExpenseEntity) {
    setEditing(exp.id);
    setForm({
      title: exp.title,
      totalAmount: exp.totalAmount,
      installments: exp.installments,
      date: exp.date,
      notes: exp.notes,
      operationType: exp.operationType,
      paymentType: exp.paymentType,
      categoryId: exp.categoryId,
    });
    setError(null);
  }

  // =============================
  // Cancelar edição
  // =============================
  function cancel() {
    setEditing(null);
    setForm({});
    setError(null);
  }

  // =============================
  // Salvar
  // =============================
  async function save(id: string) {
    try {
      setSaving(true);
      setError(null);

      const payload: Partial<ExpenseEntity> = {
        ...form,
        totalAmount:
          form.totalAmount != null
            ? Number(form.totalAmount)
            : undefined,
        date: form.date ? localInputToIso(form.date) : undefined,
        installments:
          form.operationType === "purchase"
            ? form.installments
            : 1,
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
        Nenhuma despesa registrada ainda.
      </div>
    );
  }

  return (
    <div className="mt-6 space-y-3">
      {items.map((exp) => {
        const isEditing = editing === exp.id;

        return (
          <div
            key={exp.id}
            className="rounded-2xl border border-zinc-700/40 bg-zinc-900 p-4"
          >

            {/* ===================== VISUAL ===================== */}
            {!isEditing ? (
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-zinc-100 font-medium truncate">
                    {exp.title}
                  </p>
                  <p className="text-xs text-zinc-400">
                    {new Date(exp.date).toLocaleString(locale)}
                  </p>

                  {exp.operationType === "purchase" && (
                    <p className="text-xs text-emerald-400">
                      {exp.installments}x – Parcelada
                    </p>
                  )}

                  {exp.notes && (
                    <p className="mt-1 text-xs text-zinc-400 line-clamp-2">
                      {exp.notes}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <span className="tabular-nums font-semibold text-zinc-200">
                    {fmt.format(exp.totalAmount)}
                  </span>
                  <button
                    onClick={() => startEdit(exp)}
                    className="inline-flex items-center gap-2 rounded-xl border border-zinc-700/60 bg-zinc-800 px-3 py-2 text-xs font-medium text-zinc-200 hover:bg-zinc-700"
                  >
                    <Pencil className="h-4 w-4" /> Editar
                  </button>
                </div>
              </div>
            ) : (
              // ===================== FORM EDIT =====================
              <div className="grid grid-cols-1 md:grid-cols-6 gap-3">

                {/* TÍTULO */}
                <input
                  className="md:col-span-2 rounded-xl bg-zinc-800 border border-zinc-700/60 px-3 py-2 text-zinc-100"
                  placeholder="Título"
                  value={form.title ?? ""}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, title: e.target.value }))
                  }
                />

                {/* VALOR */}
                <input
                  className="rounded-xl bg-zinc-800 border border-zinc-700/60 px-3 py-2 text-zinc-100"
                  placeholder="Valor"
                  value={form.totalAmount ?? ""}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      totalAmount: Number(e.target.value),
                    }))
                  }
                />

                {/* TIPO: PURCHASE / RECURRING */}
                <select
                  aria-label="Tipo de operação"
                  className="rounded-xl bg-zinc-800 border border-zinc-700/60 px-3 py-2 text-zinc-100"
                  value={form.operationType ?? "purchase"}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      operationType: e.target.value as "purchase" | "recurring",
                    }))
                  }
                >
                  <option value="purchase">Parcelada</option>
                  <option value="recurring">Recorrente</option>
                </select>

                {/* PARCELAS */}
                {form.operationType === "purchase" && (
                  <input
                   aria-label="Número de parcelas"
                    type="number"
                    min={1}
                    className="rounded-xl bg-zinc-800 border border-zinc-700/60 px-3 py-2 text-zinc-100"
                    value={form.installments ?? 1}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        installments: Number(e.target.value),
                      }))
                    }
                  />
                )}

                {/* DATA */}
                <input
                  aria-label="Data da despesa"
                  type="datetime-local"
                  className="rounded-xl bg-zinc-800 border border-zinc-700/60 px-3 py-2 text-zinc-100"
                  value={isoToLocalInput(form.date ?? new Date().toISOString())}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      date: e.target.value,
                    }))
                  }
                />

                {/* BOTÕES */}
                <div className="flex items-center gap-2">
                  <button
                    disabled={saving}
                    onClick={() => save(exp.id)}
                    className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2 font-semibold text-emerald-950 hover:brightness-95 disabled:opacity-50"
                  >
                    <Save className="h-4 w-4" /> Salvar
                  </button>
                  <button
                    disabled={saving}
                    onClick={cancel}
                    className="inline-flex items-center gap-2 rounded-xl border border-zinc-700/60 bg-zinc-800 px-4 py-2 font-semibold text-zinc-200 hover:bg-zinc-700"
                  >
                    <X className="h-4 w-4" /> Cancelar
                  </button>
                </div>

                {error && (
                  <p className="md:col-span-6 text-sm text-rose-400">
                    {error}
                  </p>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}