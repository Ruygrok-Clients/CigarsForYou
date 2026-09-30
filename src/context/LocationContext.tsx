import React, { createContext, useContext, useEffect, useState } from 'react';
import { AUSTRALIAN_STATES } from '../constants/locations';

interface LocationContextType {
  selectedLocation: string;
  setSelectedLocation: (code: string) => void;
}

const LOCATION_KEY = 'cfy_selected_location_v1';

const LocationContext = createContext<LocationContextType | undefined>(undefined);

function readStoredLocation(): string {
  try {
    const saved = localStorage.getItem(LOCATION_KEY);
    if (saved && AUSTRALIAN_STATES.some((state) => state.code === saved && state.available)) {
      return saved;
    }
  } catch {
    // ignore storage failures
  }
  return 'NSW';
}

export const LocationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [selectedLocation, setSelectedLocationState] = useState(readStoredLocation);

  useEffect(() => {
    try {
      localStorage.setItem(LOCATION_KEY, selectedLocation);
    } catch {
      // ignore storage failures
    }
  }, [selectedLocation]);

  const setSelectedLocation = (code: string) => {
    const match = AUSTRALIAN_STATES.find((state) => state.code === code);
    if (!match?.available) return;
    setSelectedLocationState(code);
  };

  return (
    <LocationContext.Provider value={{ selectedLocation, setSelectedLocation }}>
      {children}
    </LocationContext.Provider>
  );
};

export const useLocationSelection = () => {
  const context = useContext(LocationContext);
  if (!context) {
    throw new Error('useLocationSelection must be used within a LocationProvider');
  }
  return context;
};
