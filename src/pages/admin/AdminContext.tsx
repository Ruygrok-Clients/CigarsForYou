import React, { createContext, useContext, useState, useEffect } from 'react';

interface AdminContextType {
  screenLocked: boolean;
  toggleScreenLock: () => void;
  theme: 'dark' | 'light';
  toggleTheme: () => void;
}

const AdminContext = createContext<AdminContextType | undefined>(undefined);

export const AdminContextProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [screenLocked, setScreenLocked] = useState<boolean>(() => {
    return localStorage.getItem('cfy_admin_screen_lock') === 'true';
  });

  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    return (localStorage.getItem('cfy_admin_theme') as 'dark' | 'light') || 'dark';
  });

  useEffect(() => {
    localStorage.setItem('cfy_admin_screen_lock', String(screenLocked));
  }, [screenLocked]);

  useEffect(() => {
    localStorage.setItem('cfy_admin_theme', theme);
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const toggleScreenLock = () => setScreenLocked(prev => !prev);
  const toggleTheme = () => setTheme(prev => prev === 'dark' ? 'light' : 'dark');

  return (
    <AdminContext.Provider value={{ screenLocked, toggleScreenLock, theme, toggleTheme }}>
      {children}
    </AdminContext.Provider>
  );
};

export const useAdminContext = () => {
  const context = useContext(AdminContext);
  if (!context) {
    throw new Error('useAdminContext must be used within an AdminContextProvider');
  }
  return context;
};
