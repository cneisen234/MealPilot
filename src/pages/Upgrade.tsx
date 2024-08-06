// src/pages/Upgrade.tsx
import React from "react";
import { FaCheck, FaTimes, FaCrown } from "react-icons/fa";

interface PlanFeature {
  feature: string;
  free: boolean;
  basic: boolean;
  premium: boolean;
}

const planFeatures: PlanFeature[] = [
  { feature: "Create a profile", free: true, basic: true, premium: true },
  { feature: "Connect with friends", free: true, basic: true, premium: true },
  { feature: "Join interest groups", free: true, basic: true, premium: true },
  { feature: "Ad-free experience", free: false, basic: true, premium: true },
  { feature: "Advanced matchmaking", free: false, basic: true, premium: true },
  {
    feature: "Exclusive events access",
    free: false,
    basic: false,
    premium: true,
  },
  {
    feature: "Priority customer support",
    free: false,
    basic: false,
    premium: true,
  },
];

const PlanCard: React.FC<{
  title: string;
  price: string;
  features: boolean[];
  recommended?: boolean;
}> = ({ title, price, features, recommended = false }) => (
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
      {title}
    </h2>
    <div style={{ fontSize: "32px", fontWeight: "bold", marginBottom: "20px" }}>
      {price}
    </div>
    <ul style={{ listStyle: "none", padding: 0, margin: 0, width: "100%" }}>
      {planFeatures.map((planFeature, index) => (
        <li
          key={index}
          style={{
            display: "flex",
            alignItems: "center",
            marginBottom: "10px",
            color: features[index] ? "var(--text-color)" : "rgba(0, 0, 0, 0.4)",
          }}>
          {features[index] ? (
            <FaCheck style={{ color: "green", marginRight: "10px" }} />
          ) : (
            <FaTimes style={{ color: "red", marginRight: "10px" }} />
          )}
          {planFeature.feature}
        </li>
      ))}
    </ul>
    <button
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
        if (!recommended) e.currentTarget.style.color = "var(--primary-color)";
      }}>
      {title === "Free" ? "Current Plan" : "Upgrade Now"}
    </button>
  </div>
);

const Upgrade: React.FC = () => {
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
          marginBottom: "20px",
          color: "var(--primary-color)",
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
        <PlanCard
          title="Free"
          price="$0/month"
          features={planFeatures.map((f) => f.free)}
        />
        <PlanCard
          title="Basic"
          price="$9.99/month"
          features={planFeatures.map((f) => f.basic)}
          recommended
        />
        <PlanCard
          title="Premium"
          price="$19.99/month"
          features={planFeatures.map((f) => f.premium)}
        />
      </div>
    </div>
  );
};

export default Upgrade;
