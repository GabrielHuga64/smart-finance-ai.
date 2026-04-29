import React, { createContext, useContext, useState, useEffect } from 'react';

interface BalanceContextType {
  isBalanceHidden: boolean;
  toggleBalance: () => void;
  formatCurrencyMasked: (amount: number, forceShow?: boolean) => string;
}

const BalanceContext = createContext<BalanceContextType | undefined>(undefined);

export function BalanceProvider({ children }: { children: React.ReactNode }) {
  const [isBalanceHidden, setIsBalanceHidden] = useState(() => {
    const saved = localStorage.getItem('isBalanceHidden');
    return saved ? JSON.parse(saved) : false;
  });

  useEffect(() => {
    localStorage.setItem('isBalanceHidden', JSON.stringify(isBalanceHidden));
  }, [isBalanceHidden]);

  const toggleBalance = () => setIsBalanceHidden(!isBalanceHidden);

  const formatCurrencyMasked = (amount: number, forceShow: boolean = false) => {
    if (isBalanceHidden && !forceShow) {
      return 'Rp ***.***';
    }
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);
  };

  return (
    <BalanceContext.Provider value={{ isBalanceHidden, toggleBalance, formatCurrencyMasked }}>
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
