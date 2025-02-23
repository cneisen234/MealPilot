import React, { createContext, useState, useEffect, useContext } from "react";
import { checkPrimaryPaymentMethod } from "../utils/api";

interface AuthContextType {
  isAuthenticated: boolean;
  isAffiliateAuthenticated: boolean;
  login: (
    token: string,
    ai_actions: number,
    has_subscription: boolean,
    name: string,
    email: string
  ) => void;
  loginAffiliate: (
    token: string,
    name: string,
    email: string,
    affiliateCode: string
  ) => void;
  logout: () => void;
  logoutAffiliate: () => void;
  checkAuthStatus: () => Promise<void>;
  checkAffiliateAuthStatus: () => Promise<void>;
  setAiActionsRemaining: (aiActionsRemaining: number) => void;
  aiActionsRemaining: number;
  hasSubscription: boolean;
  setHasSubscription: (value: boolean) => void;
  userName: string;
  userEmail: string;
  affiliateName: string | null;
  affiliateEmail: string | null;
  affiliateCode: string | null;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  // Regular user states
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [aiActionsRemaining, setAiActionsRemaining] = useState(() => {
    const storedValue = localStorage.getItem("aiActionsRemaining");
    return storedValue ? parseInt(storedValue) : 60;
  });
  const [hasSubscription, setHasSubscription] = useState(() => {
    const storedValue = localStorage.getItem("hasSubscription");
    return storedValue ? JSON.parse(storedValue) : false;
  });
  const [userName, setUserName] = useState(() => {
    const storedValue = localStorage.getItem("userName");
    return storedValue ? JSON.parse(storedValue) : null;
  });
  const [userEmail, setUserEmail] = useState(() => {
    const storedValue = localStorage.getItem("userEmail");
    return storedValue ? JSON.parse(storedValue) : null;
  });

  // Affiliate states
  const [isAffiliateAuthenticated, setIsAffiliateAuthenticated] =
    useState(false);
  const [affiliateName, setAffiliateName] = useState(() => {
    const storedValue = localStorage.getItem("affiliateName");
    return storedValue ? JSON.parse(storedValue) : null;
  });
  const [affiliateEmail, setAffiliateEmail] = useState(() => {
    const storedValue = localStorage.getItem("affiliateEmail");
    return storedValue ? JSON.parse(storedValue) : null;
  });
  const [affiliateCode, setAffiliateCode] = useState(() => {
    const storedValue = localStorage.getItem("affiliateCode");
    return storedValue ? JSON.parse(storedValue) : null;
  });

  // Regular user effects
  useEffect(() => {
    localStorage.setItem("hasSubscription", JSON.stringify(hasSubscription));
  }, [hasSubscription]);

  useEffect(() => {
    localStorage.setItem("aiActionsRemaining", aiActionsRemaining.toString());
  }, [aiActionsRemaining]);

  useEffect(() => {
    localStorage.setItem("userName", JSON.stringify(userName));
  }, [userName]);

  useEffect(() => {
    localStorage.setItem("userEmail", JSON.stringify(userEmail));
  }, [userEmail]);

  // Affiliate effects
  useEffect(() => {
    localStorage.setItem("affiliateName", JSON.stringify(affiliateName));
  }, [affiliateName]);

  useEffect(() => {
    localStorage.setItem("affiliateEmail", JSON.stringify(affiliateEmail));
  }, [affiliateEmail]);

  useEffect(() => {
    localStorage.setItem("affiliateCode", JSON.stringify(affiliateCode));
  }, [affiliateCode]);

  const checkAuthStatus = async () => {
    const token = localStorage.getItem("token");
    console.log(token);
    if (token) {
      try {
        const paymentResponse = await checkPrimaryPaymentMethod();
        setHasSubscription(paymentResponse.data.hasSubscription);
        setAiActionsRemaining(paymentResponse.data.aiActions || 60);
        setIsAuthenticated(true);
      } catch (error) {
        console.error("Error checking auth status:", error);
        logout();
      }
    } else {
      setIsAuthenticated(false);
      setHasSubscription(false);
    }
  };

  const checkAffiliateAuthStatus = async () => {
    const token = localStorage.getItem("affiliateToken");
    console.log(token);
    if (token) {
      setIsAffiliateAuthenticated(true);
    } else {
      setIsAffiliateAuthenticated(false);
      logoutAffiliate();
    }
  };

  useEffect(() => {
    checkAuthStatus();
    checkAffiliateAuthStatus();
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

  const loginAffiliate = (
    token: string,
    name: string,
    email: string,
    affiliateCode: string
  ) => {
    console.log(affiliateCode);
    localStorage.setItem("affiliateToken", token);
    setAffiliateName(name);
    setAffiliateEmail(email);
    setAffiliateCode(affiliateCode);
    setIsAffiliateAuthenticated(true);
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("hasSubscription");
    localStorage.removeItem("aiActionsRemaining");
    localStorage.removeItem("userName");
    localStorage.removeItem("userEmail");
    setIsAuthenticated(false);
    setHasSubscription(false);
    setUserName(null);
    setUserEmail(null);
  };

  const logoutAffiliate = () => {
    localStorage.removeItem("affiliateToken");
    localStorage.removeItem("affiliateName");
    localStorage.removeItem("affiliateEmail");
    localStorage.removeItem("affiliateCode");
    setIsAffiliateAuthenticated(false);
    setAffiliateName(null);
    setAffiliateEmail(null);
    setAffiliateCode(null);
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        isAffiliateAuthenticated,
        login,
        loginAffiliate,
        logout,
        logoutAffiliate,
        checkAuthStatus,
        checkAffiliateAuthStatus,
        setAiActionsRemaining,
        aiActionsRemaining,
        hasSubscription,
        setHasSubscription,
        userName,
        userEmail,
        affiliateName,
        affiliateEmail,
        affiliateCode,
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
