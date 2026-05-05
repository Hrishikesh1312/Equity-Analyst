import axios from "axios";

const BASE = "http://localhost:8000";

export interface NetWorthInvestment {
  id: string;
  ticker: string;
  quantity: number;
  current_price?: number;
  purchase_date?: string;
  notes?: string;
}

export interface NetWorthOtherAsset {
  id: string;
  name: string;
  amount: number;
  type: string; // RD, FD, Gold, Crypto, etc.
  purchase_date?: string;
  notes?: string;
}

export interface NetWorthData {
  bank_balance: number;
  investments: NetWorthInvestment[];
  other_assets: NetWorthOtherAsset[];
  last_updated: string;
}

export async function getNetWorthData(): Promise<NetWorthData> {
  const response = await axios.get(`${BASE}/networth/data`);
  return response.data;
}

export async function saveNetWorthData(data: NetWorthData): Promise<{ status: string; message: string }> {
  const response = await axios.post(`${BASE}/networth/save`, data);
  return response.data;
}

export async function getValuations(tickers: string[]): Promise<Record<string, any>> {
  const response = await axios.post(`${BASE}/networth/valuations`, tickers);
  return response.data;
}

export async function exportNetWorthExcel(): Promise<{ 
  status: string; 
  message: string; 
  file_path: string;
  total_networth: number;
}> {
  const response = await axios.post(`${BASE}/networth/export`);
  return response.data;
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
  }).format(value);
}

export function calculateTotalNetWorth(data: NetWorthData): number {
  const investmentsValue = data.investments.reduce(
    (sum, inv) => sum + (inv.quantity * (inv.current_price || 0)),
    0
  );
  const otherAssetsValue = data.other_assets.reduce(
    (sum, asset) => sum + asset.amount,
    0
  );
  return data.bank_balance + investmentsValue + otherAssetsValue;
}
