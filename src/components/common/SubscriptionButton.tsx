import React, { useState } from "react";
import { createSubscription } from "../../utils/api";
import { useToast } from "../../context/ToastContext";
import "../../styles/subscription.css";

interface SubscriptionButtonProps {
  onSuccess: () => void; // Callback to update the subscription state in parent
}

const SubscriptionButton: React.FC<SubscriptionButtonProps> = ({
  onSuccess,
}) => {
  const [consent, setConsent] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const { showToast } = useToast();

  const handleSubscribe = async () => {
    if (!consent) {
      showToast("Please agree to the subscription terms", "error");
      return;
    }

    setIsProcessing(true);
    try {
      const response = await createSubscription({ consent });

      if (response.data.success) {
        // Show success message
        showToast("Subscription activated successfully!", "success");

        // Notify parent component to update subscription state
        onSuccess();
      }
    } catch (error) {
      showToast("Error creating subscription", "error");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div style={{ marginLeft: 0, marginRight: 0 }}>
      <div className="terms-content">
        <h3>Subscription Terms</h3>
        <p>
          By subscribing, you agree to be charged $14.99 per month for paid
          access to MealSphere. Your subscription will automatically renew each
          month until cancelled. You may cancel at any time, but please note:
        </p>
        <ul className="terms-list">
          <li className="term-item">
            Your current subscription will remain active until the end of your
            billing period.
          </li>
          <li className="term-item">
            No refunds are provided for partial months or unused time.
          </li>
          <li className="term-item">
            Each monthly subscription period begins on your billing date and
            continues for 30 days.
          </li>
        </ul>
      </div>

      <div className="consent-wrapper">
        <label className="consent-label">
          <input
            type="checkbox"
            className="consent-checkbox"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
          />
          I agree to the subscription terms and authorize recurring monthly
          charges of $14.99
        </label>
      </div>

      <button
        className={`subscribe-button ${
          !consent || isProcessing ? "disabled" : ""
        }`}
        onClick={handleSubscribe}
        disabled={!consent || isProcessing}>
        {isProcessing ? "Processing..." : "Subscribe Now"}
      </button>
    </div>
  );
};

export default SubscriptionButton;
