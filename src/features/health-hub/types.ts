export type Position = {
  assetId: string;
  name: string;
  type: "crypto" | "stock" | "fiat" | string;
  quantity: number;
  invested: number;
  averagePrice: number;
  averagePriceBRL?: string;
  averagePriceUSD?: string;
};

export type Rates = {
  btc_usd: number;
  btc_brl: number;
  usd_brl: number;
  source: string;
  fetchedAt: string;
};

export type PositionsResponse = {
  positions: Position[];
  rates: Rates;
};

export type DashboardSummary = {
  period: {
    from: string; // ISO
    to: string;   // ISO
  };
  expenses: {
    total: number;
  };
  installments: {
    totalPaid: number;
    totalPending: number;
    countPaid: number;
    countPending: number;
  };
};

export type WealthOverview = {
  positions: Position[];
  rates: Rates;
  period: DashboardSummary["period"];
  expenses: DashboardSummary["expenses"];
  installments: DashboardSummary["installments"];
};

export type OperationType = "purchase" | "recurring";
