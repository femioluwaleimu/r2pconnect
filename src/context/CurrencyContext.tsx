import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface ExchangeRates {
  [key: string]: number;
}

interface CurrencyContextType {
  currency: string;
  setCurrency: (currency: string) => void;
  convert: (amount: number, fromCurrency?: string) => number;
  formatCurrency: (amount: number, fromCurrency?: string) => string;
  loading: boolean;
  rates: ExchangeRates;
  saveCurrencyPreference: (currency: string) => Promise<void>;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

const currencySymbols: { [key: string]: string } = {
  USD: '$',
  NGN: '₦',
  EUR: '€',
  GBP: '£',
};

const CURRENCY_STORAGE_KEY = 'preferred_currency';

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrencyState] = useState('NGN');
  const [rates, setRates] = useState<ExchangeRates>({ USD: 1 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load from localStorage first
    const stored = localStorage.getItem(CURRENCY_STORAGE_KEY);
    if (stored) {
      setCurrencyState(stored);
    }
    
    fetchExchangeRates();
    loadUserPreference();
  }, []);

  const loadUserPreference = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user?.user_metadata?.preferred_currency) {
      setCurrencyState(user.user_metadata.preferred_currency);
      localStorage.setItem(CURRENCY_STORAGE_KEY, user.user_metadata.preferred_currency);
    }
  };

  const fetchExchangeRates = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('currency-convert', {
        body: { base: 'USD' }
      });
      
      if (error) throw error;
      
      if (data?.rates) {
        setRates(data.rates);
      }
    } catch (error) {
      console.error('Failed to fetch exchange rates:', error);
      // Fallback rates
      setRates({
        USD: 1,
        NGN: 1550,
        EUR: 0.92,
        GBP: 0.79,
      });
    } finally {
      setLoading(false);
    }
  };

  const setCurrency = (newCurrency: string) => {
    setCurrencyState(newCurrency);
    localStorage.setItem(CURRENCY_STORAGE_KEY, newCurrency);
  };

  const saveCurrencyPreference = async (newCurrency: string) => {
    setCurrency(newCurrency);
    
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.auth.updateUser({
        data: { preferred_currency: newCurrency }
      });
    }
  };

  const convert = (amount: number, fromCurrency: string = 'USD'): number => {
    if (fromCurrency === currency) return amount;
    
    // Convert to USD first, then to target currency
    const amountInUSD = fromCurrency === 'USD' ? amount : amount / (rates[fromCurrency] || 1);
    const convertedAmount = amountInUSD * (rates[currency] || 1);
    
    return Math.round(convertedAmount * 100) / 100;
  };

  const formatCurrency = (amount: number, fromCurrency: string = 'USD'): string => {
    const converted = convert(amount, fromCurrency);
    const symbol = currencySymbols[currency] || currency;
    
    return `${symbol}${converted.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency, convert, formatCurrency, loading, rates, saveCurrencyPreference }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const context = useContext(CurrencyContext);
  if (context === undefined) {
    throw new Error('useCurrency must be used within a CurrencyProvider');
  }
  return context;
}
