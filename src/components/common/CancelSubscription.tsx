import React, { useState, useEffect } from "react";
import { FaExclamationTriangle, FaTimes } from "react-icons/fa";
import { getSubscriptionInfo } from "../../utils/api"; // Use the getSubscriptionInfo function
import { useToast } from "../../context/ToastContext";
import AnimatedTechIcon from "../common/AnimatedTechIcon";
import "../../styles/cancelsubscription.css";

interface SubscriptionInfo {
  current_period_end?: number; // Unix timestamp
  status?: string;
}

interface CancelSubscriptionProps {
  onCancel: () => Promise<void>; // Expecting a cancel function passed as a prop
}

const CancelSubscription: React.FC<CancelSubscriptionProps> = ({
  onCancel,
}) => {
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [subscriptionInfo, setSubscriptionInfo] =
    useState<SubscriptionInfo | null>(null);
  const { showToast } = useToast();

  // Fetch subscription info when component mounts
  useEffect(() => {
    const fetchSubscriptionInfo = async () => {
      try {
        const response = await getSubscriptionInfo();
        const { data } = response;

        if (data.current_period_end) {
          setSubscriptionInfo({
            current_period_end: data.current_period_end,
            status: data.status,
          });
        } else {
          showToast("No active subscription found", "error");
        }
      } catch (error) {
        console.error("Error fetching subscription info:", error);
        showToast("Error fetching subscription info", "error");
      }
    };

    fetchSubscriptionInfo();
  }, [showToast]);

  const handleCancelSubscription = async () => {
    setIsProcessing(true);
    try {
      // Use the passed down cancelSubscription function
      await onCancel(); // This will call the parent's cancel function
      setShowConfirmModal(false);
    } catch (error) {
      showToast("Error cancelling subscription", "error");
    } finally {
      setIsProcessing(false);
    }
  };

  const ConfirmationModal = () => (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: "500px" }}>
        <div className="modal-header">
          <FaExclamationTriangle
            style={{
              color: "var(--secondary-color)",
              marginRight: "10px",
              fontSize: "24px",
            }}
          />
          <h2>Cancel Subscription</h2>
          <button
            onClick={() => setShowConfirmModal(false)}
            className="modal-close-btn"
            style={{ position: "absolute", right: "20px", top: "20px" }}>
            <FaTimes />
          </button>
        </div>

        <div style={{ padding: "20px" }}>
          <p>Are you sure you want to cancel your subscription?</p>
          <p>
            If you cancel, you'll still have access to all premium features
            until{" "}
            {subscriptionInfo?.current_period_end
              ? new Date(
                  subscriptionInfo.current_period_end * 1000
                ).toLocaleDateString()
              : "N/A"}
            .
          </p>
          <p>
            After this date, you will no longer be able to access your account.
          </p>
        </div>

        <div
          className="modal-footer"
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: "10px",
            padding: "20px",
          }}>
          <button
            onClick={() => setShowConfirmModal(false)}
            className="cancel-button"
            disabled={isProcessing}>
            Keep Subscription
          </button>
          <button
            onClick={handleCancelSubscription}
            className="confirm-button"
            disabled={isProcessing}>
            {isProcessing ? (
              <div
                style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <AnimatedTechIcon size={20} speed={4} />
                <span>Processing...</span>
              </div>
            ) : (
              "Confirm Cancellation"
            )}
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ padding: 0 }}>
      <div className="subscription-status">
        <h3>Subscription Status</h3>
        <p>Your subscription is currently active.</p>
        <p>
          Next billing date:{" "}
          {subscriptionInfo?.current_period_end
            ? new Date(
                subscriptionInfo.current_period_end * 1000
              ).toLocaleDateString()
            : "N/A"}
        </p>
      </div>
      <button
        onClick={() => setShowConfirmModal(true)}
        className="cancel-subscription-button">
        Cancel Subscription
      </button>
      {showConfirmModal && <ConfirmationModal />}
    </div>
  );
};

export default CancelSubscription;
