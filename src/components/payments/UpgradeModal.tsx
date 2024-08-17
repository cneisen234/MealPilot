import React, { useState } from "react";
import { PaymentTier, User } from "../../types";
import { CardElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { FaCrown, FaSpinner } from "react-icons/fa";
import { upgradeUser, confirmUpgrade, getProfile } from "../../utils/api";
import InfoModal from "../InfoModal";

interface UpgradeModalProps {
  tier: PaymentTier;
  currentUser: User;
  onClose: () => void;
  confirm: () => void;
  message: any;
}

const UpgradeModal: React.FC<UpgradeModalProps> = ({
  tier,
  currentUser,
  onClose,
  confirm,
  message,
}) => {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements) {
      setError("Stripe has not been initialized.");
      return;
    }

    const cardElement = elements.getElement(CardElement);

    if (!cardElement) {
      setError("Unable to find card element.");
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const { error, paymentMethod } = await stripe.createPaymentMethod({
        type: "card",
        card: cardElement,
      });

      if (error) {
        throw new Error(error.message);
      }

      const { clientSecret, newTier } = await upgradeUser(
        currentUser.id,
        tier,
        paymentMethod.id
      );

      const { error: confirmError, paymentIntent } =
        await stripe.confirmCardPayment(clientSecret);

      if (confirmError) {
        throw new Error(confirmError.message);
      }

      if (paymentIntent.status === "succeeded") {
        await confirmUpgrade(currentUser.id, paymentIntent.id, newTier);
      } else {
        throw new Error("Payment was not successful. Please try again.");
      }
    } catch (err: any) {
      setError(err.message || "An error occurred during the upgrade process.");
    } finally {
      setIsProcessing(false);
      confirm();
      message("You're all set! Enjoy!");
      onClose();
    }
  };

  const price = tier === PaymentTier.Basic ? "9.99" : "19.99";
  const nextBillingDate = new Date();
  nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 1000,
      }}>
      <div
        style={{
          background: "var(--surface-color)",
          borderRadius: "15px",
          padding: "30px",
          maxWidth: "400px",
          width: "90%",
          boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
        }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            marginBottom: "20px",
          }}>
          <FaCrown
            style={{
              color: "var(--primary-color)",
              marginRight: "10px",
              fontSize: "24px",
            }}
          />
          <h2 style={{ color: "var(--primary-color)", margin: 0 }}>
            Upgrade to {PaymentTier[tier]}
          </h2>
        </div>
        <p style={{ marginBottom: "15px", color: "var(--text-color)" }}>
          Price: ${price}/month
        </p>
        <p style={{ marginBottom: "15px", color: "var(--text-color)" }}>
          Your new plan benefits will start immediately upon successful payment.
        </p>
        <p style={{ marginBottom: "20px", color: "var(--text-color)" }}>
          Your next billing date will be: {nextBillingDate.toLocaleDateString()}
        </p>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: "20px" }}>
            <CardElement
              options={{
                style: {
                  base: {
                    fontSize: "16px",
                    color: "var(--text-color)",
                    "::placeholder": {
                      color: "#aab7c4",
                    },
                  },
                  invalid: {
                    color: "#9e2146",
                  },
                },
              }}
            />
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: "10px",
            }}>
            <button
              type="button"
              onClick={onClose}
              disabled={isProcessing}
              style={{
                padding: "10px 20px",
                borderRadius: "5px",
                border: "none",
                backgroundColor: "var(--surface-color)",
                color: "var(--text-color)",
                cursor: "pointer",
              }}>
              Cancel
            </button>
            <button
              type="submit"
              disabled={!stripe || isProcessing}
              style={{
                padding: "10px 20px",
                borderRadius: "5px",
                border: "none",
                backgroundColor: "var(--primary-color)",
                color: "white",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}>
              {isProcessing ? (
                <>
                  <FaSpinner
                    style={{
                      marginRight: "10px",
                      animation: "spin 1s linear infinite",
                    }}
                  />
                  Processing...
                </>
              ) : (
                "Confirm Upgrade"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UpgradeModal;
