import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface Address {
  firstName: string;
  lastName: string;
  company?: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  phone: string;
  email: string;
}

interface CheckoutState {
  step: number;
  shippingAddress: Address;
  billingAddress: Address;
  selectedShipping: string;
  orderNotes: string;
  createdOrder: any;
  isBillingSameAsShipping: boolean;
}

interface CheckoutContextType {
  checkoutState: CheckoutState;
  updateCheckoutState: (updates: Partial<CheckoutState>) => void;
  resetCheckoutState: () => void;
  clearStorage: () => void;
  saveToStorage: () => void;
  loadFromStorage: () => void;
}

const defaultCheckoutState: CheckoutState = {
  step: 1,
  shippingAddress: {
    firstName: '',
    lastName: '',
    company: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    postalCode: '',
    country: '',
    phone: '',
    email: ''
  },
  billingAddress: {
    firstName: '',
    lastName: '',
    company: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    postalCode: '',
    country: '',
    phone: '',
    email: ''
  },
  selectedShipping: '',
  orderNotes: '',
  createdOrder: null,
  isBillingSameAsShipping: true
};

export const CheckoutContext = createContext<CheckoutContextType | undefined>(undefined);

export const useCheckout = () => {
  const context = useContext(CheckoutContext);
  if (!context) {
    throw new Error('useCheckout must be used within a CheckoutProvider');
  }
  return context;
};

interface CheckoutProviderProps {
  children: ReactNode;
}

export const CheckoutProvider: React.FC<CheckoutProviderProps> = ({ children }) => {
  const [checkoutState, setCheckoutState] = useState<CheckoutState>(defaultCheckoutState);

  // Load from localStorage on mount
  useEffect(() => {
    loadFromStorage();
  }, []);

  // Save to localStorage whenever state changes
  useEffect(() => {
    saveToStorage();
  }, [checkoutState]);

  const updateCheckoutState = (updates: Partial<CheckoutState>) => {
    console.log('Updating checkout state with:', updates);
    setCheckoutState(prev => {
      const newState = { ...prev, ...updates };
      
      // If billing same as shipping is true, update billing address when shipping changes
      if (updates.shippingAddress && newState.isBillingSameAsShipping) {
        console.log('Updating billing address to match shipping address');
        newState.billingAddress = { ...updates.shippingAddress };
      }
      
      console.log('New checkout state:', newState);
      return newState;
    });
  };

  const resetCheckoutState = () => {
    console.log('Resetting checkout state');
    setCheckoutState(defaultCheckoutState);
    localStorage.removeItem('checkout-state');
  };

  const clearStorage = () => {
    console.log('Clearing localStorage');
    localStorage.removeItem('checkout-state');
  };

  const saveToStorage = () => {
    try {
      localStorage.setItem('checkout-state', JSON.stringify(checkoutState));
    } catch (error) {
      console.error('Failed to save checkout state to localStorage:', error);
    }
  };

  const loadFromStorage = () => {
    try {
      const saved = localStorage.getItem('checkout-state');
      if (saved) {
        const parsedState = JSON.parse(saved);
        console.log('Loading checkout state from localStorage:', parsedState);
        console.log('Shipping state from localStorage:', parsedState.shippingAddress?.state);
        console.log('Billing state from localStorage:', parsedState.billingAddress?.state);
        setCheckoutState(parsedState);
      }
    } catch (error) {
      console.error('Failed to load checkout state from localStorage:', error);
    }
  };

  const value: CheckoutContextType = {
    checkoutState,
    updateCheckoutState,
    resetCheckoutState,
    clearStorage,
    saveToStorage,
    loadFromStorage
  };

  return (
    <CheckoutContext.Provider value={value}>
      {children}
    </CheckoutContext.Provider>
  );
};

export default CheckoutProvider;
