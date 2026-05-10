import React, { createContext, useContext, useState, useEffect } from 'react';

interface BalanceContextType {
  visibilityState: number; // 0: Default (>50M masked), 1: All masked, 2: All visible
  toggleBalance: () => void;
  formatCurrencyMasked: (amount: number, forceShow?: boolean) => string;
}

const BalanceContext = createContext<BalanceContextType | undefined>(undefined);

export function BalanceProvider({ children }: { children: React.ReactNode }) {
  const [visibilityState, setVisibilityState] = useState<number>(() => {
    const saved = localStorage.getItem('visibilityState');
    if (saved !== null) {
        return parseInt(saved, 10);
    }
    // Migrate old state if exists
    const oldSaved = localStorage.getItem('isBalanceHidden');
    if (oldSaved !== null) {
        return JSON.parse(oldSaved) ? 1 : 2; // If it was hidden, make it all masked (1), else all visible (2)
    }
    return 0; // Default state
  });

  useEffect(() => {
    localStorage.setItem('visibilityState', visibilityState.toString());
  }, [visibilityState]);

  const toggleBalance = () => {
      setVisibilityState((prev) => (prev + 1) % 3);
  };

  const formatCurrencyMasked = (amount: number, forceShow: boolean = false) => {
    if (forceShow || visibilityState === 2) {
        return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);
    }
    if (visibilityState === 1) {
        return 'Rp ***.***';
    }
    // visibilityState === 0
    if (amount >= 50000000) {
        return 'Rp ***.***';
    }
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);
  };

  return (
    <BalanceContext.Provider value={{ visibilityState, toggleBalance, formatCurrencyMasked }}>
      {children}
    </BalanceContext.Provider>
  );
}

export function useBalance() {
  const context = useContext(BalanceContext);
  if (context === undefined) {
    throw new Error('useBalance must be used within a BalanceProvider');
  }
  return context;
}
