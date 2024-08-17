import React, { useEffect, useState } from "react";
import { FaCheck, FaTimes, FaCrown, FaInfoCircle } from "react-icons/fa";
import ConfirmationModal from "../components/payments/ConfirmationModal";
import UpgradeModal from "../components/payments/UpgradeModal";
import InfoModal from "../components/InfoModal";
import { PaymentTier, User } from "../types";
import { upgradeUser, downgradeUser, getProfile } from "../utils/api";
import { CardElement, useElements, useStripe } from "@stripe/react-stripe-js";
import AnimatedTechIcon from "../components/animatedTechIcon";

const Upgrade: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showDowngradeModal, setShowDowngradeModal] = useState(false);
  const [selectedTier, setSelectedTier] = useState<PaymentTier | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [infoModalMessage, setInfoModalMessage] = useState("");
  const [showInfoModal, setShowInfoModal] = useState(false);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await getProfile();
        setCurrentUser(response.data);
      } catch (error) {
        console.error("Error fetching user profile:", error);
        setInfoModalMessage("Error loading user data. Please try again.");
        setShowInfoModal(true);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUser();
  }, [showInfoModal]);

  const handleTierSelect = (tier: PaymentTier) => {
    setSelectedTier(tier);
    if (currentUser) {
      const currentTier =
        PaymentTier[
          currentUser.payment_tier as unknown as keyof typeof PaymentTier
        ];
      if (tier < currentTier) {
        setShowUpgradeModal(true);
      } else if (tier > currentTier) {
        setShowDowngradeModal(true);
      }
    }
  };

  const handleDowngrade = async () => {
    if (currentUser && selectedTier) {
      try {
        const response = await downgradeUser(currentUser.id, selectedTier);
        setCurrentUser(response.data.user);
        setInfoModalMessage(
          `Downgrade scheduled. Your current benefits will remain active until ${new Date(
            response.data.downgradeDateEpoch * 1000
          ).toLocaleDateString()}. After this date, your plan will change to ${
            PaymentTier[selectedTier]
          }.`
        );
        setShowInfoModal(true);
      } catch (error) {
        console.error("Error downgrading user:", error);
        setInfoModalMessage("Error processing downgrade. Please try again.");
        setShowInfoModal(true);
      }
    }
    setShowDowngradeModal(false);
  };

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
          background:
            currentUser &&
            tier ===
              PaymentTier[
                currentUser.payment_tier as unknown as keyof typeof PaymentTier
              ]
              ? "#d3d3d3"
              : recommended
              ? "var(--primary-color)"
              : "var(--surface-color)",
          color:
            recommended ||
            (currentUser &&
              tier ===
                PaymentTier[
                  currentUser.payment_tier as unknown as keyof typeof PaymentTier
                ])
              ? "white"
              : "var(--primary-color)",
          border:
            currentUser &&
            tier ===
              PaymentTier[
                currentUser.payment_tier as unknown as keyof typeof PaymentTier
              ]
              ? "none"
              : `2px solid var(--primary-color)`,
          borderRadius: "25px",
          padding: "10px 20px",
          fontSize: "16px",
          fontWeight: "bold",
          cursor:
            currentUser &&
            tier ===
              PaymentTier[
                currentUser.payment_tier as unknown as keyof typeof PaymentTier
              ]
              ? "default"
              : "pointer",
          transition: "all 0.3s ease",
        }}
        onMouseEnter={(e) => {
          if (
            !(
              tier ===
              PaymentTier[
                currentUser?.payment_tier as unknown as keyof typeof PaymentTier
              ]
            )
          ) {
            e.currentTarget.style.transform = "scale(1.05)";
            if (!recommended)
              e.currentTarget.style.background = "var(--primary-color)";
            if (!recommended) e.currentTarget.style.color = "white";
          }
        }}
        onMouseLeave={(e) => {
          if (
            !(
              tier ===
              PaymentTier[
                currentUser?.payment_tier as unknown as keyof typeof PaymentTier
              ]
            )
          ) {
            e.currentTarget.style.transform = "scale(1)";
            if (!recommended)
              e.currentTarget.style.background = "var(--surface-color)";
            if (!recommended)
              e.currentTarget.style.color = "var(--primary-color)";
          }
        }}
        // @ts-ignore
        disabled={
          currentUser &&
          tier ===
            PaymentTier[
              currentUser.payment_tier as unknown as keyof typeof PaymentTier
            ]
        }>
        {currentUser &&
        tier ===
          PaymentTier[
            currentUser.payment_tier as unknown as keyof typeof PaymentTier
          ]
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

      {showUpgradeModal && selectedTier && currentUser && (
        <UpgradeModal
          tier={selectedTier}
          currentUser={currentUser}
          onClose={() => setShowUpgradeModal(false)}
          confirm={() => setShowInfoModal(true)}
          message={setInfoModalMessage}
        />
      )}

      {showDowngradeModal && selectedTier && (
        <ConfirmationModal
          message={`Are you sure you want to downgrade to the ${PaymentTier[selectedTier]} tier? This may result in loss of data and features.`}
          additionalInfo="Your current plan benefits will remain active until the end of your billing cycle. After that date, your plan will be downgraded."
          onClose={() => setShowDowngradeModal(false)}
          onConfirm={handleDowngrade}
        />
      )}

      <InfoModal
        isOpen={showInfoModal}
        onClose={() => setShowInfoModal(false)}
        message={infoModalMessage}
      />
    </div>
  );
};

export default Upgrade;
