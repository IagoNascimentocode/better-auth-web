import { api } from "../../lib/http";
import type {
  ICreateExpensesPayload,
  IUpdateExpensesPayload,
  ExpenseEntity,
} from "./types";

// CREATE
export async function apiCreateExpense(payload: ICreateExpensesPayload) {
  return await api("/expenses/create", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

// UPDATE
export async function apiUpdateExpense(id: string, payload: IUpdateExpensesPayload) {
  return await api(`/expenses/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

// DELETE
export async function apiDeleteExpense(id: string) {
  return await api(`/expenses/${id}`, {
    method: "DELETE",
  });
}

// LIST ALL
export async function apiListExpenses(userId: string): Promise<ExpenseEntity[]> {
  const result = await api(`/expenses/${userId}`, {
    method: "GET",
  });

  // Se o backend retorna um array direto:
  if (Array.isArray(result)) return result;
  return [];
}