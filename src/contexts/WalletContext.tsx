import React, { createContext, useContext, useState, useCallback } from 'react';

export type TransactionType = 
  | 'deposit' 
  | 'arena_entry' 
  | 'arena_win'
  | 'streak_entry'
  | 'streak_win'
  | 'pool_entry'
  | 'pool_win'
  | 'finger_entry'
  | 'finger_win';

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  description: string;
  timestamp: Date;
}

interface WalletContextType {
  balance: number;
  transactions: Transaction[];
  addFunds: (amount: number) => void;
  deductFunds: (amount: number, type: TransactionType, description: string) => boolean;
  addWinnings: (amount: number, type: TransactionType, description: string) => void;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export const WalletProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [balance, setBalance] = useState(12500);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  const addTransaction = useCallback((type: TransactionType, amount: number, description: string) => {
    const newTransaction: Transaction = {
      id: `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      amount,
      description,
      timestamp: new Date(),
    };
    setTransactions(prev => [newTransaction, ...prev]);
  }, []);

  const addFunds = useCallback((amount: number) => {
    setBalance(prev => prev + amount);
    addTransaction('deposit', amount, 'Demo funds added');
  }, [addTransaction]);

  const deductFunds = useCallback((amount: number, type: TransactionType, description: string): boolean => {
    if (balance < amount) return false;
    setBalance(prev => prev - amount);
    addTransaction(type, -amount, description);
    return true;
  }, [balance, addTransaction]);

  const addWinnings = useCallback((amount: number, type: TransactionType, description: string) => {
    setBalance(prev => prev + amount);
    addTransaction(type, amount, description);
  }, [addTransaction]);

  return (
    <WalletContext.Provider value={{ balance, transactions, addFunds, deductFunds, addWinnings }}>
      {children}
    </WalletContext.Provider>
  );
};

export const useWallet = () => {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
};
