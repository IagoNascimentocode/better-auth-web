import React from "react";
import { X } from "lucide-react";

import Modal from "../ui/Modal";
import type { ICreateTransactionPayload, TransactionEntity, TransactionType } from "../BankBalanceCard.old";

type Props = {
  open: boolean;
  onClose: () => void;
  defaultType?: TransactionType;
  userId: string;
  defaultCategoryId: string;
  onCreate: (payload: ICreateTransactionPayload) => Promise<TransactionEntity>;
};

export default function CreateTransactionModal({
  open, onClose, defaultType = "income", userId, defaultCategoryId, onCreate,
}: Props) {
  const [title, setTitle] = React.useState("");
  const [amount, setAmount] = React.useState("");
  const [type, setType] = React.useState<TransactionType>(defaultType);
  const [date, setDate] = React.useState(() => new Date().toISOString().slice(0,16));
  const [notes, setNotes] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (open) {
      setType(defaultType);
      setTitle(""); setAmount(""); setNotes("");
      setDate(new Date().toISOString().slice(0,16));
      setError(null);
    }
  }, [open, defaultType]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    try {
      setBusy(true);
      if (!title.trim()) throw new Error("Informe o título");
      if (!amount.trim() || Number.isNaN(Number(amount))) throw new Error("Valor inválido");
      const payload: ICreateTransactionPayload = {
        title: title.trim(),
        amount: Number(amount).toFixed(2),
        type,
        date: new Date(date).toISOString(),
        notes: notes.trim() || undefined,
        categoryId: defaultCategoryId,
        userId,
      };
      await onCreate(payload);
      onClose();
    } catch (err: any) {
      setError(err?.message || "Falha ao criar");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose}>
      <button
        type="button"
        onClick={onClose}
        className="absolute right-3 top-3 rounded-lg border border-zinc-700/60 bg-zinc-800 p-2 text-zinc-300 hover:bg-zinc-700"
        aria-label="Fechar"
      >
        <X className="h-4 w-4" />
      </button>

      <h3 className="mb-4 text-lg font-semibold text-zinc-100">Nova transação</h3>

      <form onSubmit={submit} className="grid grid-cols-1 gap-3">
        <input className="rounded-xl bg-zinc-800 border border-zinc-700/60 px-3 py-2 text-zinc-100"
               placeholder="Título" value={title} onChange={(e) => setTitle(e.target.value)} />
        <div className="grid grid-cols-2 gap-3">
          <input className="rounded-xl bg-zinc-800 border border-zinc-700/60 px-3 py-2 text-zinc-100"
                 placeholder="Valor (ex: 123.45)" value={amount} onChange={(e) => setAmount(e.target.value)} />
          <select className="rounded-xl bg-zinc-800 border border-zinc-700/60 px-3 py-2 text-zinc-100"
                  value={type} onChange={(e) => setType(e.target.value as TransactionType)}>
            <option value="income">Entrada</option>
            <option value="expense">Saída</option>
          </select>
        </div>
        <input type="datetime-local" className="rounded-xl bg-zinc-800 border border-zinc-700/60 px-3 py-2 text-zinc-100"
               value={date} onChange={(e) => setDate(e.target.value)} />
        <textarea className="rounded-xl bg-zinc-800 border border-zinc-700/60 px-3 py-2 text-zinc-100"
                  placeholder="Notas (opcional)" value={notes} onChange={(e) => setNotes(e.target.value)} />

        {error && <p className="text-sm text-rose-400">{error}</p>}

        <div className="mt-2 flex items-center justify-end gap-2">
          <button type="button" onClick={onClose}
                  className="rounded-xl border border-zinc-700/60 bg-zinc-800 px-4 py-2 font-semibold text-zinc-200 hover:bg-zinc-700">
            Cancelar
          </button>
          <button type="submit" disabled={busy}
                  className="rounded-xl bg-emerald-500 px-4 py-2 font-semibold text-emerald-950 hover:brightness-95 disabled:opacity-50">
            {busy ? "Salvando…" : "Salvar"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
