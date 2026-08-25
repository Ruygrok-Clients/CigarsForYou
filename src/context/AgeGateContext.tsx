import React, { createContext, useContext, useState } from 'react';

interface AgeGateContextType {
  isAgeVerified: boolean;
  verifyAge: () => void;
  rejectAge: () => void;
  resetVerification: () => void;
}

const AGE_GATE_KEY = 'cfy_age_verified_v1';

const AgeGateContext = createContext<AgeGateContextType | undefined>(undefined);

export const AgeGateProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAgeVerified, setIsAgeVerified] = useState<boolean>(() => {
    return localStorage.getItem(AGE_GATE_KEY) === 'true';
  });

  const verifyAge = () => {
    localStorage.setItem(AGE_GATE_KEY, 'true');
    setIsAgeVerified(true);
  };

  const rejectAge = () => {
    localStorage.removeItem(AGE_GATE_KEY);
    setIsAgeVerified(false);
  };

  const resetVerification = () => {
    localStorage.removeItem(AGE_GATE_KEY);
    setIsAgeVerified(false);
  };

  return (
    <AgeGateContext.Provider value={{ isAgeVerified, verifyAge, rejectAge, resetVerification }}>
      {children}
    </AgeGateContext.Provider>
  );
};

export const useAgeGate = () => {
  const context = useContext(AgeGateContext);
  if (!context) {
    throw new Error('useAgeGate must be used within an AgeGateProvider');
  }
  return context;
};
