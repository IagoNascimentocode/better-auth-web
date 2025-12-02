export interface BalanceRates {
  btc_usd: number;
  btc_brl: number;
  brl_usd: number;
  source?: string;
  fetchedAt?: string;
}

export interface BalanceData {
  brl: string;  // backend retorna string
  usd: string;
  btc: string;
  rates: BalanceRates;
}

export interface BalanceResponse {
  balance: BalanceData;
}