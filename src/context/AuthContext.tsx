import React, { createContext, useContext, useState, useEffect } from 'react';
import { AppRole, Profile } from '../types';

interface AuthContextType {
  role: AppRole;
  setRole: (role: AppRole) => void;
  currentUser: Profile;
  walletGlobalEnabled: boolean;
  setWalletGlobalEnabled: (enabled: boolean) => void;
}

const STORAGE_KEY_ROLE = 'unitel_credit_role';
const STORAGE_KEY_WALLET = 'unitel_credit_wallet_enabled';

const DEMO_USERS: Record<AppRole, Profile> = {
  analyst: {
    id: 'u-analyst-1',
    full_name: 'Tomas Silva (Analyst)',
    role: 'analyst',
  },
  approver: {
    id: 'u-approver-1',
    full_name: 'Dra. Maria Mendes (Approver)',
    role: 'approver',
  },
  admin: {
    id: 'u-admin-1',
    full_name: 'Eng. Carlos Neto (Admin)',
    role: 'admin',
  },
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [role, setRoleState] = useState<AppRole>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_ROLE);
    if (saved === 'analyst' || saved === 'approver' || saved === 'admin') {
      return saved;
    }
    return 'analyst';
  });

  const [walletGlobalEnabled, setWalletGlobalEnabledState] = useState<boolean>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_WALLET);
    return saved !== null ? saved === 'true' : false;
  });

  const setRole = (newRole: AppRole) => {
    setRoleState(newRole);
    localStorage.setItem(STORAGE_KEY_ROLE, newRole);
  };

  const setWalletGlobalEnabled = (enabled: boolean) => {
    setWalletGlobalEnabledState(enabled);
    localStorage.setItem(STORAGE_KEY_WALLET, String(enabled));
  };

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_ROLE, role);
  }, [role]);

  return (
    <AuthContext.Provider
      value={{
        role,
        setRole,
        currentUser: DEMO_USERS[role],
        walletGlobalEnabled,
        setWalletGlobalEnabled,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
