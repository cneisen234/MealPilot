import React, { useEffect, useRef, useState } from "react";
import { PaymentTier, User } from "../../types";
import { CardElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { FaCrown, FaInfoCircle, FaSpinner } from "react-icons/fa";
import {
  upgradeUser,
  confirmUpgrade,
  checkPrimaryPaymentMethod,
} from "../../utils/api";

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
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [highlightCheckbox, setHighlightCheckbox] = useState(false);
  const [isCardComplete, setIsCardComplete] = useState(false);
  const [addPaymentMessage, setAddPaymentMessage] = useState(false);
  const checkboxRef = useRef<HTMLInputElement>(null);
  const [hasPrimaryPaymentMethod, setHasPrimaryPaymentMethod] = useState(false);
  const [usePrimaryPaymentMethod, setUsePrimaryPaymentMethod] = useState(false);
  const [primaryPaymentMethod, setPrimaryPaymentMethod] = useState<{
    last4: string;
    brand: string;
  } | null>(null);

  useEffect(() => {
    const checkPaymentMethod = async () => {
      try {
        const response = await checkPrimaryPaymentMethod(currentUser.id);
        // @ts-ignore
        setHasPrimaryPaymentMethod(response?.hasPrimaryPaymentMethod);
        setPrimaryPaymentMethod({
          // @ts-ignore
          last4: response.last4,
          // @ts-ignore
          brand: response.brand,
        });
      } catch (error) {
        console.error("Error checking primary payment method:", error);
      }
    };
    checkPaymentMethod();
  }, [currentUser.id]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!usePrimaryPaymentMethod && !isCardComplete) {
      setAddPaymentMessage(true);
      return;
    }

    if (!agreedToTerms) {
      setHighlightCheckbox(true);
      checkboxRef.current?.scrollIntoView({ behavior: "smooth" });
      return;
    }

    if (!stripe || (!elements && !usePrimaryPaymentMethod)) {
      return;
    }

    setIsProcessing(true);

    try {
      let paymentMethodId: string | undefined;

      if (!usePrimaryPaymentMethod) {
        const cardElement = elements!.getElement(CardElement);
        if (!cardElement) {
          throw new Error("Unable to find card element.");
        }

        const { error, paymentMethod } = await stripe.createPaymentMethod({
          type: "card",
          card: cardElement,
        });

        if (error) {
          throw new Error(error.message);
        }

        paymentMethodId = paymentMethod.id;
      }

      const { clientSecret, newTier } = await upgradeUser(
        currentUser.id,
        tier,
        // @ts-ignore
        paymentMethodId
      );

      const { error: confirmError, paymentIntent } =
        await stripe.confirmCardPayment(clientSecret);

      if (confirmError) {
        throw new Error(confirmError.message);
      }

      if (paymentIntent.status === "succeeded") {
        await confirmUpgrade(currentUser.id, paymentIntent.id, newTier);
        setAddPaymentMessage(false);
      } else {
        throw new Error("Payment was not successful. Please try again.");
      }
    } catch (err: any) {
      console.error("An error occurred during the upgrade process.", err);
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
  const isBasicToPremiumUpgrade =
    PaymentTier[
      currentUser.payment_tier as unknown as keyof typeof PaymentTier
    ] === PaymentTier.Basic && tier === PaymentTier.Premium;
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
        <h3 style={{ color: "var(--primary-color)" }}>
          <FaInfoCircle /> Important Subscription Information
        </h3>
        <ul>
          <li>Your subscription will begin immediately upon confirmation.</li>
          <li>
            To cancel, you must downgrade to the free tier through your account
            settings.
          </li>
          <li>No refunds will be given for partial months.</li>
          <li>
            Your subscription will continue until you choose to downgrade or
            cancel.
          </li>
          {isBasicToPremiumUpgrade && (
            <li>
              For the first month you will be charged a prorated amount that is
              based on the premium price subtracted by your remaining basic
              plan. This is designed to keep cost fair to you.
            </li>
          )}
        </ul>
        <form onSubmit={handleSubmit}>
          {hasPrimaryPaymentMethod && (
            <>
              <div style={{ marginBottom: "20px" }}>
                <label style={{ display: "flex", alignItems: "center" }}>
                  <input
                    type="checkbox"
                    checked={usePrimaryPaymentMethod}
                    onChange={(e) =>
                      setUsePrimaryPaymentMethod(e.target.checked)
                    }
                    style={{ marginRight: "10px" }}
                  />
                  Use {primaryPaymentMethod?.brand} ending in{" "}
                  {primaryPaymentMethod?.last4}
                </label>
              </div>
            </>
          )}
          {!usePrimaryPaymentMethod && (
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
                      backgroundColor: "red",
                    },
                  },
                }}
                onChange={(event) => {
                  setIsCardComplete(event.complete);
                }}
              />
            </div>
          )}
          {addPaymentMessage && (
            <div className="form-group" style={{ marginTop: "20px" }}>
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  color: "red",
                  transition: "color 0.3s ease",
                }}>
                Please add a valid payment
              </label>
            </div>
          )}
          <div className="form-group" style={{ marginTop: "20px" }}>
            <label
              style={{
                display: "flex",
                alignItems: "center",
                color: highlightCheckbox ? "red" : "inherit",
                transition: "color 0.3s ease",
              }}>
              <input
                ref={checkboxRef}
                type="checkbox"
                checked={agreedToTerms}
                onChange={(e) => {
                  setAgreedToTerms(e.target.checked);
                  setHighlightCheckbox(false);
                }}
                style={{
                  marginRight: "10px",
                  outline: highlightCheckbox ? "2px solid red" : "none",
                  transition: "outline 0.3s ease",
                }}
              />
              I have read and agree to the subscription terms.
            </label>
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
