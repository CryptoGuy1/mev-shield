/**
 * Global state management using Zustand
 */

import { create } from 'zustand';

export interface Transaction {
  txHash: string;
  timestamp: string;
  riskScore: number;
  protectionMethod: 'public' | 'private' | 'timelock';
  savingsUsd: number;
  status: 'pending' | 'success' | 'failed';
  attackType?: string;
}

export interface NetworkStats {
  currentGasPrice: number;
  pendingTxCount: number;
  blockNumber: number;
  mevDetectedLastHour: number;
  totalProtectedTx: number;
  totalSavingsUsd: number;
}

interface AppState {
  // Network stats
  stats: NetworkStats;
  setStats: (stats: NetworkStats) => void;
  
  // Transactions
  transactions: Transaction[];
  addTransaction: (tx: Transaction) => void;
  
  // WebSocket connection
  wsConnected: boolean;
  setWsConnected: (connected: boolean) => void;
  
  // User settings
  riskThreshold: number;
  setRiskThreshold: (threshold: number) => void;
  
  protectionLevel: 'auto' | 'always' | 'manual';
  setProtectionLevel: (level: 'auto' | 'always' | 'manual') => void;
  
  // UI state
  selectedTx: Transaction | null;
  setSelectedTx: (tx: Transaction | null) => void;
}

export const useStore = create<AppState>((set) => ({
  // Initial stats
  stats: {
    currentGasPrice: 0,
    pendingTxCount: 0,
    blockNumber: 0,
    mevDetectedLastHour: 0,
    totalProtectedTx: 0,
    totalSavingsUsd: 0,
  },
  setStats: (stats) => set({ stats }),
  
  // Transactions
  transactions: [],
  addTransaction: (tx) => set((state) => ({
    transactions: [tx, ...state.transactions].slice(0, 100) // Keep last 100
  })),
  
  // WebSocket
  wsConnected: false,
  setWsConnected: (connected) => set({ wsConnected: connected }),
  
  // Settings
  riskThreshold: 70,
  setRiskThreshold: (threshold) => set({ riskThreshold: threshold }),
  
  protectionLevel: 'auto',
  setProtectionLevel: (level) => set({ protectionLevel: level }),
  
  // UI
  selectedTx: null,
  setSelectedTx: (tx) => set({ selectedTx: tx }),
}));
