export function formatCurrencyBRL(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatDateRangeWithTilde(fromISO: string, toISO: string) {
  const from = new Date(fromISO);
  const to = new Date(toISO);

  const fmt = new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  return `${fmt.format(from)} ~ ${fmt.format(to)}`;
}

export function percent(part: number, total: number): number {
  if (!total || total <= 0) return 0;
  return (part / total) * 100;
}

export function toInputDate(d: Date): string {
  return d.toISOString().slice(0, 10); // yyyy-MM-dd
}

export const WEALTH_RANGE_STORAGE_KEY = (userId: string) =>
  `wealthhub:date-range:${userId}`;
