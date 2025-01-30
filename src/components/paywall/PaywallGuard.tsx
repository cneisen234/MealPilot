import React, { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import AnimatedTechIcon from "../common/AnimatedTechIcon";
import PaywallPage from "./PaywallPage";

interface PaywallGuardProps {
  element: React.ReactElement;
}

const PaywallGuard: React.FC<PaywallGuardProps> = ({ element }) => {
  const { isAuthenticated, hasSubscription } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [showPaywall, setShowPaywall] = useState(false);

  useEffect(() => {
    // Only show content when we're certain about both auth and subscription status
    if (isAuthenticated) {
      setIsLoading(false);
      setShowPaywall(!hasSubscription);
    }
  }, [isAuthenticated, hasSubscription]);

  if (isLoading) {
    return (
      <div className="loading-container">
        <AnimatedTechIcon size={100} speed={4} />
      </div>
    );
  }

  if (showPaywall) {
    return (
      <div className="loading-container">
        <PaywallPage />
      </div>
    );
  }

  return element;
};

export default PaywallGuard;
