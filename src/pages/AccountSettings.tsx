import React, { useState, useEffect } from "react";
import { CardElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { FaCreditCard, FaTimes, FaCheck } from "react-icons/fa";
import { useAuth } from "../context/AuthContext";
import {
  cancelSubscription,
  checkPrimaryPaymentMethod,
  updatePaymentMethod,
} from "../utils/api";
import AnimatedTechIcon from "../components/common/AnimatedTechIcon";
import "../styles/accountsettings.css";
import SubscriptionButton from "../components/common/SubscriptionButton";
import CancelSubscription from "../components/common/CancelSubscription";

interface PaymentMethod {
  brand: string;
  last4: string;
  exp_month: number;
  exp_year: number;
}

interface AddressInfo {
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
}

interface SubscriptionStatus {
  active: boolean;
  cancelAtPeriodEnd: boolean;
  currentPeriodEnd: string | null;
}

const AccountSettings = () => {
  const { hasSubscription, setHasSubscription } = useAuth();
  const stripe = useStripe();
  const elements = useElements();

  const [showPaymentUpdate, setShowPaymentUpdate] = useState(false);
  const [paymentUpdateError, setPaymentUpdateError] = useState<string | null>(
    null
  );
  const [paymentUpdateSuccess, setPaymentUpdateSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentPaymentMethod, setCurrentPaymentMethod] =
    useState<PaymentMethod | null>(null);
  const [cancelAtPeriodEnd, setCancelAtPeriodEnd] = useState(false);

  const [address, setAddress] = useState<AddressInfo>({
    line1: "",
    line2: "",
    city: "",
    state: "",
    postal_code: "",
    country: "US",
  });

  useEffect(() => {
    fetchCurrentPaymentMethod();
  }, []);

  const fetchCurrentPaymentMethod = async () => {
    try {
      setIsLoading(true);
      const info = await checkPrimaryPaymentMethod();

      if (info?.data.hasPaymentMethod) {
        setCurrentPaymentMethod({
          brand: info.data.paymentMethod.brand,
          last4: info.data.paymentMethod.last4,
          exp_month: info.data.paymentMethod.exp_month,
          exp_year: info.data.paymentMethod.exp_year,
        });

        // Set subscription status
        setCancelAtPeriodEnd(info.data.cancelAtPeriodEnd || false);
      }
    } catch (error) {
      console.error("Error fetching payment method:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setAddress((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleUpdatePaymentMethod = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    const cardElement = elements.getElement(CardElement);
    if (!cardElement) return;

    try {
      setIsLoading(true);
      setPaymentUpdateError(null);
      setPaymentUpdateSuccess(false);

      const { error, paymentMethod } = await stripe.createPaymentMethod({
        type: "card",
        card: cardElement,
      });

      if (error) {
        throw new Error(error.message);
      }

      const response = await updatePaymentMethod(paymentMethod.id, address);

      if (response.data.success) {
        setPaymentUpdateSuccess(true);
        setShowPaymentUpdate(false);
        await fetchCurrentPaymentMethod();
        cardElement.clear();
      }
    } catch (error: any) {
      setPaymentUpdateError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelSubscription = async () => {
    try {
      await cancelSubscription();
      await fetchCurrentPaymentMethod(); // Refresh subscription status
    } catch (error) {
      console.error("Error cancelling subscription", error);
    }
  };

  const handleSubscriptionSuccess = () => {
    setHasSubscription(true);
    fetchCurrentPaymentMethod(); // Refresh subscription status
  };

  console.log(!hasSubscription, cancelAtPeriodEnd);

  const showSubscriptionButton = !hasSubscription || cancelAtPeriodEnd;

  return (
    <div
      className="account-settings-container"
      style={{ marginTop: 100, marginBottom: 100 }}>
      <div className="account-settings-header">
        <h1>Settings</h1>
      </div>

      <div className="payment-section">
        <h2>Payment Method</h2>

        {isLoading ? (
          <div className="loading-container">
            <AnimatedTechIcon size={40} speed={4} />
          </div>
        ) : currentPaymentMethod ? (
          <div className="current-payment-method">
            <FaCreditCard className="card-icon" />
            <span>
              {currentPaymentMethod.brand.toUpperCase()} ending in{" "}
              {currentPaymentMethod.last4}
            </span>
            <span className="expiry">
              Expires {currentPaymentMethod.exp_month}/
              {currentPaymentMethod.exp_year}
            </span>
          </div>
        ) : (
          <p>No payment method on file</p>
        )}

        <button
          onClick={() => setShowPaymentUpdate(!showPaymentUpdate)}
          className="update-payment-button">
          {showPaymentUpdate ? (
            <>
              <FaTimes /> Cancel
            </>
          ) : (
            <>
              <FaCreditCard /> {currentPaymentMethod ? "Update" : "Add"} Payment
              Method
            </>
          )}
        </button>

        {showPaymentUpdate && (
          <form onSubmit={handleUpdatePaymentMethod} className="payment-form">
            <div className="card-element-container">
              <CardElement
                options={{
                  style: {
                    base: {
                      fontSize: "16px",
                      color: "#424770",
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

            <div className="address-section">
              <h3>Billing Address</h3>
              <div className="address-grid">
                <input
                  name="line1"
                  value={address.line1}
                  onChange={handleAddressChange}
                  placeholder="Street Address"
                  required
                  className="full-width"
                />
                <input
                  name="line2"
                  value={address.line2}
                  onChange={handleAddressChange}
                  placeholder="Apt, Suite, etc. (optional)"
                  className="full-width"
                />
                <input
                  name="city"
                  value={address.city}
                  onChange={handleAddressChange}
                  placeholder="City"
                  required
                />
                <input
                  name="state"
                  value={address.state}
                  onChange={handleAddressChange}
                  placeholder="State"
                  required
                />
                <input
                  name="postal_code"
                  value={address.postal_code}
                  onChange={handleAddressChange}
                  placeholder="ZIP Code"
                  required
                />
              </div>
            </div>

            {paymentUpdateError && (
              <div className="error-message">
                <FaTimes /> {paymentUpdateError}
              </div>
            )}

            {paymentUpdateSuccess && (
              <div className="success-message">
                <FaCheck /> Payment method updated successfully!
              </div>
            )}

            <button
              type="submit"
              disabled={!stripe || isLoading}
              className="submit-button">
              {isLoading ? (
                <AnimatedTechIcon size={20} speed={4} />
              ) : (
                "Save Payment Method"
              )}
            </button>
          </form>
        )}
      </div>
      <br />
      {currentPaymentMethod && (
        <div className="subscription-section">
          {showSubscriptionButton ? (
            <SubscriptionButton onSuccess={handleSubscriptionSuccess} />
          ) : (
            <CancelSubscription onCancel={handleCancelSubscription} />
          )}
        </div>
      )}
    </div>
  );
};

export default AccountSettings;
