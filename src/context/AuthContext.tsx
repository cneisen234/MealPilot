import React, { createContext, useState, useEffect, useContext } from "react";
import { checkPrimaryPaymentMethod } from "../utils/api";

interface AuthContextType {
  isAuthenticated: boolean;
  login: (
    token: string,
    ai_actions: number,
    has_subscription: boolean,
    name: string,
    email: string
  ) => void;
  logout: () => void;
  checkAuthStatus: () => Promise<void>;
  setAiActionsRemaining: (aiActionsRemaining: number) => void;
  aiActionsRemaining: number;
  hasSubscription: boolean;
  setHasSubscription: (value: boolean) => void;
  userName: string;
  userEmail: string;
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

  const [userName, setUserName] = useState(() => {
    // Initialize from localStorage with a default of false
    const storedValue = localStorage.getItem("userName");
    return storedValue ? JSON.parse(storedValue) : null;
  });

  const [userEmail, setUserEmail] = useState(() => {
    // Initialize from localStorage with a default of false
    const storedValue = localStorage.getItem("userEmail");
    return storedValue ? JSON.parse(storedValue) : null;
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

  useEffect(() => {
    localStorage.setItem("userName", JSON.stringify(userName));
  }, [userName]);

  useEffect(() => {
    localStorage.setItem("userEmail", JSON.stringify(userEmail));
  }, [userEmail]);

  const checkAuthStatus = async () => {
    const token = localStorage.getItem("token");
    if (token) {
      try {
        // Fetch current user status including subscription and AI actions
        const paymentResponse = await checkPrimaryPaymentMethod();
        setHasSubscription(paymentResponse.data.hasSubscription);
        setAiActionsRemaining(paymentResponse.data.aiActions || 60);
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
    has_subscription: boolean,
    name: string,
    email: string
  ) => {
    localStorage.setItem("token", token);
    setAiActionsRemaining(ai_actions);
    setHasSubscription(has_subscription);
    setUserName(name);
    setUserEmail(email);
    setIsAuthenticated(true);
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("hasSubscription");
    localStorage.removeItem("aiActionsRemaining");
    localStorage.removeItem("userName");
    localStorage.removeItem("userEmail");
    setIsAuthenticated(false);
    setHasSubscription(false);
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
        userName,
        userEmail,
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
