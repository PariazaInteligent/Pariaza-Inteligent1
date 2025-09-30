
import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { User, NotificationType } from '../types';
import { authService } from '../services/authService'; // Mock service
import { useNotifications } from './NotificationContext';

interface AuthContextType {
  user: User | null;
  loadingAuth: boolean;
  login: (email: string, password: string, users: User[]) => Promise<User | null>;
  logout: () => void;
  // signup?: (userData: Partial<User>) => Promise<User | null>; // If registration is needed
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loadingAuth, setLoadingAuth] = useState<boolean>(true);
  const { addNotification } = useNotifications();

  // Check for persisted session (e.g., from a token if this were a real backend)
  // For this version, we just initialize to null and rely on login.
  // If we were to persist login, we'd do it here.
  useEffect(() => {
    // Simulate checking for a logged-in user, e.g., from session storage
    // For this app, user state is not persisted across sessions without a backend/localStorage for token
    const checkSession = async () => {
        // In a real app, you might verify a token with a backend
        // For this demo, if there's a user object in memory and data is loaded, keep it.
        // This simple check means refresh will log out unless login state is persisted.
        // setUser(null); // Simple logout on refresh for this version
        setLoadingAuth(false);
    };
    checkSession();
  }, []);


  const login = async (email: string, password: string, users: User[]): Promise<User | null> => {
    setLoadingAuth(true);
    if (!users) {
        console.error("Login attempt without users array.");
        addNotification("Sistemul nu a putut verifica utilizatorii. Încercați din nou.", NotificationType.ERROR);
        setLoadingAuth(false);
        return null; 
    }

    const loggedInUser = await authService.login(email, password, users);
    setUser(loggedInUser);
    setLoadingAuth(false);
    return loggedInUser;
  };

  const logout = () => {
    authService.logout();
    setUser(null);
    addNotification("Te-ai deconectat cu succes.", NotificationType.SUCCESS);
    // Optionally navigate to login page
  };
  
  // Value for the provider
  const authContextValue: AuthContextType = {
    user,
    loadingAuth: loadingAuth,
    login,
    logout,
  };

  return (
    <AuthContext.Provider value={authContextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};