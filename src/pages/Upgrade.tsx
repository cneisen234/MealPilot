import React, { useEffect, useState } from "react";
import {
  FaCheck,
  FaTimes,
  FaCrown,
  FaInfoCircle,
  FaLock,
} from "react-icons/fa";
import ConfirmationModal from "../components/common/ConfirmationModal";
import UpgradeModal from "../components/payments/UpgradeModal";
import InfoModal from "../components/common/InfoModal";
import { PaymentTier, User } from "../types";
import {
  downgradeUser,
  getProfile,
  getSubscriptionStatus,
  cancelDowngrade,
} from "../utils/api";
import AnimatedTechIcon from "../components/common/AnimatedTechIcon";

const Upgrade: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showDowngradeModal, setShowDowngradeModal] = useState(false);
  const [showCancelDowngradeModal, setShowCancelDowngradeModal] =
    useState(false);
  const [selectedTier, setSelectedTier] = useState<PaymentTier | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [infoModalMessage, setInfoModalMessage] = useState("");
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [subscriptionStatus, setSubscriptionStatus] = useState<any>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [userResponse, subscriptionResponse] = await Promise.all([
          getProfile(),
          getSubscriptionStatus(),
        ]);
        setCurrentUser(userResponse.data);
        setSubscriptionStatus(subscriptionResponse);
      } catch (error) {
        console.error("Error fetching data:", error);
        // Set a default subscription status for error cases
        setSubscriptionStatus({
          plan: "FREE",
          status: "free",
          nextBillingDate: null,
          scheduledDowngrade: null,
        });
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [showInfoModal]);

  const handleTierSelect = async (e: React.MouseEvent, tier: PaymentTier) => {
    e.preventDefault();
    setSelectedTier(tier);
    if (currentUser) {
      const currentTier =
        PaymentTier[
          currentUser.payment_tier as unknown as keyof typeof PaymentTier
        ];
      if (tier === currentTier && subscriptionStatus?.scheduledDowngrade) {
        // User is reselecting their current plan, so cancel the scheduled downgrade
        try {
          setShowCancelDowngradeModal(true);
        } catch (error) {
          console.error("Error cancelling downgrade:", error);
          setInfoModalMessage(
            "There was an error cancelling your scheduled downgrade. Please try again."
          );
          setShowInfoModal(true);
        }
      } else if (tier < currentTier) {
        setShowUpgradeModal(true);
      } else if (tier > currentTier) {
        setShowDowngradeModal(true);
      }
    }
  };

  const handleConfirmCancelDowngrade = async () => {
    try {
      await cancelDowngrade(currentUser!.id);
      // Refresh subscription status
      const newStatus = await getSubscriptionStatus();
      setSubscriptionStatus(newStatus);
      // Show success message to user
      setInfoModalMessage("Your scheduled downgrade has been cancelled.");
      setShowInfoModal(true);
    } catch (error) {
      console.error("Error cancelling downgrade:", error);
      setInfoModalMessage(
        "There was an error cancelling your scheduled downgrade. Please try again."
      );
      setShowInfoModal(true);
    } finally {
      setShowCancelDowngradeModal(false);
    }
  };

  const handleDowngrade = async () => {
    if (currentUser && selectedTier) {
      try {
        const response = await downgradeUser(currentUser.id, selectedTier);
        setCurrentUser(response.data.user);
        setInfoModalMessage(
          `Downgrade scheduled. Your current benefits will remain active until the end of your billing cycle. After this date, your plan will change to ${PaymentTier[selectedTier]}.`
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
        "Lena AI [6 prompts a day]",
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
        "Lena AI Chat [15 prompts a day]",
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
        "Lena AI Chat [unlimited]",
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
    currentTier: PaymentTier;
    subscriptionStatus: any;
  }> = ({
    tier,
    price,
    features,
    recommended = false,
    currentTier,
    subscriptionStatus,
  }) => {
    const isCurrentPlan = tier === currentTier;
    let isScheduledTier =
      Number(subscriptionStatus?.scheduledDowngrade?.newPlan) === tier;
    const isDowngradeScheduled =
      subscriptionStatus?.scheduledDowngrade !== null;

    const isDisabled =
      (isCurrentPlan && !isDowngradeScheduled) || // Disable current tier if no downgrade scheduled
      (isScheduledTier && isDowngradeScheduled); // Disable scheduled tier if downgrade is scheduled

    return <div>Page Unavailable</div>;

    return (
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
        {isScheduledTier && (
          <div
            style={{
              position: "absolute",
              top: "-10px",
              left: "0",
              right: "0",
              backgroundColor: "var(--secondary-color)",
              color: "white",
              padding: "5px",
              borderRadius: "5px 5px 0 0",
              fontSize: "0.8em",
              textAlign: "center",
            }}>
            Downgrade Scheduled
          </div>
        )}
        {recommended &&
          Number(subscriptionStatus?.scheduledDowngrade?.newPlan) !==
            PaymentTier["Basic"] && (
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
          style={{
            fontSize: "32px",
            fontWeight: "bold",
          }}>
          {price}
          {/* {PaymentTier[tier] !== "Free" && (
            <p style={{ marginTop: "-10px", fontSize: "0.5em" }}>
              + Tax where applicable
            </p>
          )} */}
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
                  style={{
                    color: "red",
                    marginRight: "10px",
                    minWidth: "14px",
                  }}
                />
              )}
              <span style={{ textAlign: "left" }}>
                {typeof feature === "string" ? feature : feature.text}
              </span>
            </li>
          ))}
        </ul>
        <button
          onClick={(event) => handleTierSelect(event, tier)}
          style={{
            marginTop: "20px",
            background: isDisabled
              ? "#d3d3d3"
              : recommended
              ? "var(--primary-color)"
              : "var(--surface-color)",
            color: recommended || isDisabled ? "white" : "var(--primary-color)",
            border: isDisabled ? "none" : `2px solid var(--primary-color)`,
            borderRadius: "25px",
            padding: "10px 20px",
            fontSize: "16px",
            fontWeight: "bold",
            cursor: isDisabled ? "default" : "pointer",
            transition: "all 0.3s ease",
          }}
          onMouseEnter={(e) => {
            if (!isDisabled) {
              e.currentTarget.style.transform = "scale(1.05)";
              if (!recommended)
                e.currentTarget.style.background = "var(--primary-color)";
              if (!recommended) e.currentTarget.style.color = "white";
            }
          }}
          onMouseLeave={(e) => {
            if (!isDisabled) {
              e.currentTarget.style.transform = "scale(1)";
              if (!recommended)
                e.currentTarget.style.background = "var(--surface-color)";
              if (!recommended)
                e.currentTarget.style.color = "var(--primary-color)";
            }
          }}
          // @ts-ignore
          disabled={isDisabled}>
          {currentUser && tier === currentTier ? "Current Plan" : "Select Plan"}
        </button>
        {/* {currentUser && tier < currentUser.payment_tier && (
          <div
            style={{
              marginTop: "10px",
              fontSize: "0.8em",
              color: "var(--text-color)",
            }}>
            <FaInfoCircle style={{ marginRight: "5px" }} />
            Downgrade will take effect at the end of your current billing cycle
          </div>
        )} */}
      </div>
    );
  };

  if (isLoading) {
    return (
      <AnimatedTechIcon
        style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
        }}
        size={100}
        speed={10}
      />
    );
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
        padding: "0px",
        boxSizing: "border-box",
      }}>
      <h1
        style={{
          color: "var(--primary-color)",
          marginBottom: "20px",
          textAlign: "center",
        }}>
        Upgrade Your Quest{" "}
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
            currentTier={
              PaymentTier[
                currentUser?.payment_tier as unknown as keyof typeof PaymentTier
              ]
            }
            subscriptionStatus={subscriptionStatus}
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

      {showCancelDowngradeModal && selectedTier && (
        <ConfirmationModal
          message={`Selecting this will cancel your scheduled downgrade`}
          additionalInfo="You will resume on your current plan in the next billing cycle and will be charged the normal rate"
          onClose={() => setShowCancelDowngradeModal(false)}
          onConfirm={handleConfirmCancelDowngrade}
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
