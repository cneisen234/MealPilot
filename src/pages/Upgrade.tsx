import React, { useEffect, useState } from "react";
import { FaCheck, FaTimes, FaCrown, FaInfoCircle } from "react-icons/fa";
import PaymentModal from "../components/payments/PaymentModal";
import ConfirmationModal from "../components/payments/ConfirmationModal";
import { PaymentTier, User } from "../types";
import { upgradeUser, downgradeUser, getProfile } from "../utils/api";
import { CardElement, useElements, useStripe } from "@stripe/react-stripe-js";
import AnimatedTechIcon from "../components/animatedTechIcon";

const Upgrade: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [selectedTier, setSelectedTier] = useState<PaymentTier | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const stripe = useStripe();
  const elements = useElements();

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await getProfile();
        setCurrentUser(response.data);
      } catch (error) {
        console.error("Error fetching user profile:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUser();
  }, []);

  const handleTierSelect = (tier: PaymentTier) => {
    setSelectedTier(tier);
    if (tier === PaymentTier.Free) {
      setShowConfirmationModal(true);
      // @ts-ignore
    } else if (tier > currentUser.payment_tier) {
      setShowPaymentModal(true);
    } else {
      setShowConfirmationModal(true);
    }
  };

  const handleUpgrade = async (paymentDetails: any) => {
    if (!stripe || !elements || !currentUser || !selectedTier) {
      return;
    }

    const cardElement = elements.getElement(CardElement);

    if (cardElement) {
      const { error, paymentMethod } = await stripe.createPaymentMethod({
        type: "card",
        card: cardElement,
      });

      if (error) {
        console.error("Error creating payment method:", error);
        return;
      }

      try {
        const response = await upgradeUser(
          currentUser.id,
          selectedTier,
          paymentMethod.id
        );
        setCurrentUser(response.data.user);
        alert(
          `Upgrade successful! Your new plan will be charged ${response.data.proratedAmount} for the remainder of this billing cycle.`
        );
      } catch (error) {
        console.error("Error upgrading user:", error);
        alert("Error processing upgrade. Please try again.");
      }
    }
    setShowPaymentModal(false);
  };

  const handleDowngrade = async () => {
    if (currentUser && selectedTier) {
      try {
        const response = await downgradeUser(currentUser.id, selectedTier);
        setCurrentUser(response.data.user);
        alert(
          `Downgrade scheduled. Your current benefits will remain active until ${new Date(
            response.data.downgradeDateEpoch * 1000
          ).toLocaleDateString()}. After this date, your plan will change to ${selectedTier}.`
        );
      } catch (error) {
        console.error("Error downgrading user:", error);
        alert("Error processing downgrade. Please try again.");
      }
    }
    setShowConfirmationModal(false);
  };

  if (isLoading) {
    return <AnimatedTechIcon size={100} speed={10} />;
  }

  if (!currentUser) {
    return <div>Error loading user data. Please try again.</div>;
  }

  const planFeatures = [
    {
      tier: PaymentTier.Free,
      price: "$0/month",
      features: [
        "Create a profile",
        "Personalized Interests [3 categories]",
        "VibeQuest AI Chat [6 prompts a day]",
        { text: "Connect With Friends", available: false },
        { text: "Daily Personalized Recommendation", available: false },
      ],
    },
    {
      tier: PaymentTier.Basic,
      price: "$9.99/month",
      features: [
        "Create a profile",
        "Personalized Interests [10 categories]",
        "VibeQuest AI Chat [15 prompts a day]",
        "Connect With Friends [10 friends]",
        { text: "Daily Personalized Recommendation", available: false },
      ],
      recommended: true,
    },
    {
      tier: PaymentTier.Premium,
      price: "$19.99/month",
      features: [
        "Create a profile",
        "Personalized Interests [20 categories]",
        "VibeQuest AI Chat [unlimited]",
        "Connect With Friends [unlimited]",
        "Daily Personalized Recommendation",
      ],
    },
  ];

  const PlanCard: React.FC<{
    tier: PaymentTier;
    price: string;
    features: (string | { text: string; available: boolean })[];
    recommended?: boolean;
  }> = ({ tier, price, features, recommended = false }) => (
    <div
      style={{
        background: "var(--surface-color)",
        borderRadius: "15px",
        padding: "30px",
        boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        position: "relative",
        border: recommended ? "2px solid var(--primary-color)" : "none",
        transform: recommended ? "scale(1.05)" : "scale(1)",
        transition: "all 0.3s ease",
      }}>
      {recommended && (
        <div
          style={{
            position: "absolute",
            top: "-12px",
            background: "var(--primary-color)",
            color: "white",
            padding: "5px 10px",
            borderRadius: "12px",
            fontSize: "14px",
            fontWeight: "bold",
          }}>
          Recommended
        </div>
      )}
      <h2 style={{ color: "var(--primary-color)", marginBottom: "10px" }}>
        {PaymentTier[tier]}
      </h2>
      <div
        style={{ fontSize: "32px", fontWeight: "bold", marginBottom: "20px" }}>
        {price}
      </div>
      <ul style={{ listStyle: "none", padding: 0, margin: 0, width: "100%" }}>
        {features.map((feature, index) => (
          <li
            key={index}
            style={{
              display: "flex",
              alignItems: "center",
              marginBottom: "10px",
              color:
                typeof feature === "string" || feature.available
                  ? "var(--text-color)"
                  : "rgba(0, 0, 0, 0.4)",
            }}>
            {typeof feature === "string" || feature.available ? (
              <FaCheck
                style={{
                  color: "green",
                  marginRight: "10px",
                  minWidth: "14px",
                }}
              />
            ) : (
              <FaTimes
                style={{ color: "red", marginRight: "10px", minWidth: "14px" }}
              />
            )}
            <span style={{ textAlign: "left" }}>
              {typeof feature === "string" ? feature : feature.text}
            </span>
          </li>
        ))}
      </ul>
      <button
        onClick={() => handleTierSelect(tier)}
        style={{
          marginTop: "20px",
          background: recommended
            ? "var(--primary-color)"
            : "var(--surface-color)",
          color: recommended ? "white" : "var(--primary-color)",
          border: `2px solid var(--primary-color)`,
          borderRadius: "25px",
          padding: "10px 20px",
          fontSize: "16px",
          fontWeight: "bold",
          cursor: "pointer",
          transition: "all 0.3s ease",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = "scale(1.05)";
          if (!recommended)
            e.currentTarget.style.background = "var(--primary-color)";
          if (!recommended) e.currentTarget.style.color = "white";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = "scale(1)";
          if (!recommended)
            e.currentTarget.style.background = "var(--surface-color)";
          if (!recommended)
            e.currentTarget.style.color = "var(--primary-color)";
        }}>
        {currentUser && tier === currentUser.payment_tier
          ? "Current Plan"
          : "Select Plan"}
      </button>
      {currentUser && tier < currentUser.payment_tier && (
        <div
          style={{
            marginTop: "10px",
            fontSize: "0.8em",
            color: "var(--text-color)",
          }}>
          <FaInfoCircle style={{ marginRight: "5px" }} />
          Downgrade will take effect at the end of your current billing cycle
        </div>
      )}
    </div>
  );

  if (isLoading) {
    return <AnimatedTechIcon size={100} speed={10} />;
  }

  if (!currentUser) {
    return <div>Error loading user data. Please try again.</div>;
  }

  return (
    <div
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        padding: "20px",
        boxSizing: "border-box",
      }}>
      <h1
        style={{
          color: "var(--primary-color)",
          marginBottom: "20px",
          textAlign: "center",
        }}>
        Upgrade Your Experience{" "}
        <FaCrown style={{ verticalAlign: "middle", marginLeft: "10px" }} />
      </h1>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: "20px",
          padding: "20px",
          justifyContent: "center",
        }}>
        {planFeatures.map((plan) => (
          <PlanCard
            key={plan.tier}
            tier={plan.tier}
            price={plan.price}
            features={plan.features}
            recommended={plan.recommended}
          />
        ))}
      </div>

      {showPaymentModal && selectedTier && (
        <PaymentModal
          tier={selectedTier}
          onClose={() => setShowPaymentModal(false)}
          onConfirm={handleUpgrade}
        />
      )}

      {showConfirmationModal && (
        <ConfirmationModal
          message={`Are you sure you want to ${
            selectedTier === PaymentTier.Free
              ? "downgrade to the Free tier"
              : "change your plan"
          }? This may result in loss of data and features.`}
          onClose={() => setShowConfirmationModal(false)}
          onConfirm={handleDowngrade}
        />
      )}
    </div>
  );
};

export default Upgrade;
