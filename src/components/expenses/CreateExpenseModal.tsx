import React from "react";
import Modal from "../ui/Modal";
import { X } from "lucide-react";
import type { ICreateExpensesPayload, OperationType, PaymentType } from "../../features/expenses/types";

type Props = {
  open: boolean;
  onClose: () => void;
  userId: string;
  defaultCategoryId: string;
  operationTypePreset: OperationType; // "purchase" ou "recurring"
  onCreate: (payload: ICreateExpensesPayload) => Promise<void>;
};

export default function CreateExpenseModal({
  open,
  onClose,
  userId,
  defaultCategoryId,
  operationTypePreset,
  onCreate,
}: Props) {

  const [title, setTitle] = React.useState("");
  const [totalAmount, setTotalAmount] = React.useState("");
  const [operationType, setOperationType] = React.useState<OperationType>(operationTypePreset);
  const [installments, setInstallments] = React.useState<number>(1);
  const [date, setDate] = React.useState(() => new Date().toISOString().slice(0, 16));
  const [notes, setNotes] = React.useState("");
  const [paymentType, setPaymentType] = React.useState<PaymentType | "">("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // 🔄 Reinicia ao abrir
  React.useEffect(() => {
    if (open) {
      setTitle("");
      setTotalAmount("");
      setNotes("");
      setOperationType(operationTypePreset);
      setInstallments(1);
      setPaymentType("");
      setDate(new Date().toISOString().slice(0, 16));
      setError(null);
    }
  }, [open, operationTypePreset]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();

    try {
      setBusy(true);

      if (!title.trim()) throw new Error("Informe o título");
      if (!totalAmount.trim() || Number.isNaN(Number(totalAmount))) {
        throw new Error("Valor inválido");
      }
      if (!paymentType) {
        throw new Error("Selecione uma forma de pagamento");
      }

      const finalInstallments = operationType === "purchase" ? installments : 1;

      const payload: ICreateExpensesPayload = {
        title: title.trim(),
        totalAmount: Number(totalAmount),
        installments: finalInstallments,
        date: new Date(date).toISOString(),
        notes: notes.trim() || undefined,
        categoryId: defaultCategoryId,
        userId,
        operationType,
        paymentType: paymentType as PaymentType,
       
      };

      await onCreate(payload);
      onClose();
    } catch (err: any) {
      setError(err.message || "Erro ao criar despesa");
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

      <h3 className="mb-4 text-lg font-semibold text-zinc-100">
        {operationType === "purchase" ? "Compra Parcelada" : "Despesa Recorrente"}
      </h3>

      <form onSubmit={submit} className="grid grid-cols-1 gap-3">

        {/* TÍTULO */}
        <input 
          className="rounded-xl bg-zinc-800 border border-zinc-700/60 px-3 py-2 text-zinc-100"
          placeholder="Título"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />

        {/* VALOR */}
        <input 
          className="rounded-xl bg-zinc-800 border border-zinc-700/60 px-3 py-2 text-zinc-100"
          placeholder="Valor (ex: 1200.00)"
          value={totalAmount}
          onChange={(e) => setTotalAmount(e.target.value)}
        />

        {/* PURCHASE — PARCELAMENTO */}
        {operationType === "purchase" && (
          <div className="flex flex-col gap-2">
            <label className="text-zinc-300 text-sm">Parcelas</label>

            <select
              aria-label="Parcelas"
              value={installments <= 12 ? installments : "other"}
              className="rounded-xl bg-zinc-800 border border-zinc-700/60 px-3 py-2 text-zinc-100"
              onChange={(e) => {
                const v = e.target.value;
                if (v === "other") setInstallments(13);
                else setInstallments(Number(v));
              }}
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => (
                <option key={n} value={n}>{n}x</option>
              ))}
              <option value="other">Outro…</option>
            </select>

            {installments > 12 && (
              <input
                type="number"
                min={13}
                value={installments}
                onChange={(e) => setInstallments(Number(e.target.value))}
                className="rounded-xl bg-zinc-800 border border-zinc-700/60 px-3 py-2 text-zinc-100"
                placeholder="Ex: 24"
              />
            )}
          {/* FORMA DE PAGAMENTO */}
            <select
              aria-label="Forma de Pagamento"
              className="rounded-xl bg-zinc-800 border border-zinc-700/60 px-3 py-2 text-zinc-100"
              value={paymentType}
              onChange={(e) => setPaymentType(e.target.value as PaymentType)}
            >
          {/* Mensagem inicial — não selecionável */}
              <option value="" disabled hidden>
                Selecione a forma de pagamento
              </option>
              <option value="credit_card">Cartão de Crédito</option>
              <option value="pix">PIX</option>
              <option value="boleto">Boleto</option>
              <option value="transfer">Transferência</option>
            </select>
                </div>
        )}

        {/* RECURRING — CATEGORIAS */}
        {operationType === "recurring" && (
          <select
            aria-label="Categorias"
            className="rounded-xl bg-zinc-800 border border-zinc-700/60 px-3 py-2 text-zinc-100"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          >
            <option value="" disabled hidden>Selecione uma categoria</option>
            <option value="Aluguel">Aluguel</option>
            <option value="Luz">Luz</option>
            <option value="Água">Água</option>
            <option value="Internet">Internet</option>
            <option value="Escola">Escola</option>
            <option value="Academia">Academia</option>
            <option value="Streaming">Streaming</option>
            <option value="Guardar dinheiro">Guardar Money</option>
            <option value="Outro">Outro…</option>
          </select>
        )}

        {/* DATA */}
        <input
          aria-label="Data da Despesa"
          type="datetime-local"
          className="rounded-xl bg-zinc-800 border border-zinc-700/60 px-3 py-2 text-zinc-100"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />

        {/* NOTAS */}
        <textarea
          className="rounded-xl bg-zinc-800 border border-zinc-700/60 px-3 py-2 text-zinc-100"
          placeholder="Notas (opcional)"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />

        {error && <p className="text-sm text-rose-400">{error}</p>}

        <div className="mt-2 flex justify-end gap-2">
          <button type="button" onClick={onClose}
            className="rounded-xl border border-zinc-700/60 bg-zinc-800 px-4 py-2 text-zinc-200">
            Cancelar
          </button>
          <button type="submit" disabled={busy}
            className="rounded-xl bg-emerald-500 px-4 py-2 text-emerald-950">
            {busy ? "Salvando…" : "Salvar"}
          </button>
        </div>
      </form>
    </Modal>
  );
}