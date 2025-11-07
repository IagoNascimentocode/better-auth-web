export const qk = {
  balance: (userId: string) => ["balance", userId] as const,
  me: ["me"] as const,
};
