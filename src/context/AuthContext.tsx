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
  applicant: {
    id: 'u-applicant-1',
    full_name: 'Tomas Silva (Applicant)',
    role: 'applicant',
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
    if (typeof window !== 'undefined') {
      const port = window.location.port;
      if (port === '5174') {
        const saved = localStorage.getItem(STORAGE_KEY_ROLE);
        if (saved === 'approver' || saved === 'admin') {
          return saved;
        }
        return 'approver';
      }
      if (port === '5173') {
        return 'applicant';
      }
    }
    const saved = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY_ROLE) : null;
    if (saved === 'applicant' || saved === 'approver' || saved === 'admin') {
      return saved;
    }
    return 'applicant';
  });

  const [walletGlobalEnabled, setWalletGlobalEnabledState] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const saved = localStorage.getItem(STORAGE_KEY_WALLET);
    return saved !== null ? saved === 'true' : false;
  });

  const setRole = (newRole: AppRole) => {
    // Strictly enforce port isolation
    if (typeof window !== 'undefined') {
      const port = window.location.port;
      if (port === '5174' && newRole === 'applicant') {
        // Port 5174 is exclusively Approver & Admin - block switching to applicant
        setRoleState('approver');
        localStorage.setItem(STORAGE_KEY_ROLE, 'approver');
        return;
      }
      if (port === '5173' && (newRole === 'approver' || newRole === 'admin')) {
        // Port 5173 is exclusively Applicant - block switching to approver/admin
        setRoleState('applicant');
        localStorage.setItem(STORAGE_KEY_ROLE, 'applicant');
        return;
      }
    }
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
        currentUser: DEMO_USERS[role] || DEMO_USERS.applicant,
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
