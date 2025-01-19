// src/context/AuthContext.tsx

import React, { createContext, useState, useEffect, useContext } from "react";

interface AuthContextType {
  isAuthenticated: boolean;
  login: (token: string, ai_actions: number) => void;
  logout: () => void;
  checkAuthStatus: () => void;
  setAiActionsRemaining: (aiActionsRemaining: number) => void;
  aiActionsRemaining: number;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [aiActionsRemaining, setAiActionsRemaining] = useState(40);

  const checkAuthStatus = () => {
    const token = localStorage.getItem("token");
    setIsAuthenticated(!!token);
  };

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const login = (token: string, ai_actions: number) => {
    localStorage.setItem("token", token);
    setAiActionsRemaining(ai_actions);
    setIsAuthenticated(true);
  };

  const logout = () => {
    localStorage.removeItem("token");
    setIsAuthenticated(false);
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        login,
        logout,
        checkAuthStatus,
        setAiActionsRemaining,
        aiActionsRemaining,
      }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
