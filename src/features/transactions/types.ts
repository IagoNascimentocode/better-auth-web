// src/features/transactions/types.ts
export type TransactionType = "income" | "expense";

export interface ICreateTransactionPayload {
  title: string;
  amount: string;     // "123.45"
  type: TransactionType;
  date: string;       // ISO
  notes?: string;
  categoryId: string; // uuid
  userId: string;     // uuid
}

export interface TransactionEntity {
  id: string;
  title: string;
  amount: string;
  type: TransactionType;
  date: string;       // ISO
  notes?: string | null;
  categoryId: string;
  userId: string;
  createdAt?: string;
  updatedAt?: string;
}
