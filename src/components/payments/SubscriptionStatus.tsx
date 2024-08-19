import React, { useState, useEffect } from "react";
import { getSubscriptionStatus } from "../../utils/api";
import AnimatedTechIcon from "../common/AnimatedTechIcon";

const SubscriptionStatus: React.FC = () => {
  const [status, setStatus] = useState<any>(null);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const data = await getSubscriptionStatus();
        setStatus(data);
      } catch (error) {
        console.error("Error fetching subscription status:", error);
      }
    };

    fetchStatus();
  }, []);

  if (!status) return <AnimatedTechIcon speed={10} />;

  return (
    <div>
      <h2>Your Subscription</h2>
      <p>Current Plan: {status.plan}</p>
      <p>Status: {status.status}</p>
      <p>
        Next Billing Date:{" "}
        {new Date(status.nextBillingDate).toLocaleDateString()}
      </p>
      {status.scheduledDowngrade && (
        <p>
          Scheduled Downgrade: {status.scheduledDowngrade.newPlan} on{" "}
          {new Date(status.scheduledDowngrade.date).toLocaleDateString()}
        </p>
      )}
    </div>
  );
};

export default SubscriptionStatus;
