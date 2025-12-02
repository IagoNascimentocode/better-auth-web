// Tipos aceitos pelo backend
export type OperationType = "purchase" | "recurring";

export type PaymentType =
  | "credit_card"
  | "pix"
  | "boleto"
  | "cash"
  | "transfer";

// Payload enviado ao backend
export interface ICreateExpensesPayload {
  title: string;
  totalAmount: number;
  installments: number;
  date: string;
  notes?: string;

  operationType: OperationType;
  paymentType: PaymentType;

  categoryId: string;
  userId: string;
}

export interface IUpdateExpensesPayload {
  title?: string;
  totalAmount?: number;
  installments?: number;
  date?: string;
  notes?: string;

  paymentType?: PaymentType;

  categoryId?: string;
}

// Dados retornados pelo backend
export interface ExpenseEntity {
  id: string;
  title: string;
  totalAmount: number;
  installments: number;
  date: string;
  notes?: string;
  operationType: OperationType;
  paymentType: PaymentType;
  categoryId: string;
  userId: string;
}
