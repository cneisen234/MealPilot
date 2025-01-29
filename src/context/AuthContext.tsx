import React, { createContext, useState, useEffect, useContext } from "react";
import api from "../utils/api";

interface AuthContextType {
  isAuthenticated: boolean;
  login: (token: string, ai_actions: number, has_subscription: boolean) => void;
  logout: () => void;
  checkAuthStatus: () => Promise<void>;
  setAiActionsRemaining: (aiActionsRemaining: number) => void;
  aiActionsRemaining: number;
  hasSubscription: boolean;
  setHasSubscription: (value: boolean) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [aiActionsRemaining, setAiActionsRemaining] = useState(() => {
    // Initialize from localStorage with a default of 60
    const storedValue = localStorage.getItem("aiActionsRemaining");
    return storedValue ? parseInt(storedValue) : 60;
  });

  const [hasSubscription, setHasSubscription] = useState(() => {
    // Initialize from localStorage with a default of false
    const storedValue = localStorage.getItem("hasSubscription");
    return storedValue ? JSON.parse(storedValue) : false;
  });

  // Persist subscription status to localStorage whenever it changes
  // Persist subscription status to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem("hasSubscription", JSON.stringify(hasSubscription));
  }, [hasSubscription]);

  // Persist AI actions to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem("aiActionsRemaining", aiActionsRemaining.toString());
  }, [aiActionsRemaining]);

  const checkAuthStatus = async () => {
    const token = localStorage.getItem("token");
    if (token) {
      try {
        // Fetch current user status including subscription and AI actions
        const response = await api.get("/payment/status");
        setHasSubscription(response.data.hasSubscription);
        setAiActionsRemaining(response.data.aiActionsRemaining || 60);
        setIsAuthenticated(true);
      } catch (error) {
        console.error("Error checking auth status:", error);
        // If there's an error (like an expired token), clean up
        logout();
      }
    } else {
      setIsAuthenticated(false);
      setHasSubscription(false);
    }
  };

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const login = (
    token: string,
    ai_actions: number,
    has_subscription: boolean
  ) => {
    localStorage.setItem("token", token);
    setAiActionsRemaining(ai_actions);
    setHasSubscription(has_subscription);
    setIsAuthenticated(true);
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("hasSubscription");
    localStorage.removeItem("aiActionsRemaining");
    setIsAuthenticated(false);
    setHasSubscription(false);
    setAiActionsRemaining(40);
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
        hasSubscription,
        setHasSubscription,
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
