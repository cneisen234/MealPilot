import React, { useState, useEffect } from "react";
import { FaStar, FaLightbulb, FaLock } from "react-icons/fa";
import Loading from "../components/Loading";
import { User, PaymentTier, Recommendation } from "../types";
import { getProfile } from "../utils/api";

const Recommendations: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);

  useEffect(() => {
    const fetchUserAndRecommendations = async () => {
      try {
        const userResponse = await getProfile();
        setUser(userResponse.data);

        // Fetch recommendations only if user is Premium or Owner
        if (
          PaymentTier[
            userResponse.data
              .payment_tier as unknown as keyof typeof PaymentTier
          ] === PaymentTier.Premium ||
          PaymentTier[
            userResponse.data
              .payment_tier as unknown as keyof typeof PaymentTier
          ] === PaymentTier.Owner
        ) {
          // Replace this with actual API call when implemented
          const dummyRecommendations = [
            {
              id: 1,
              category: "Books",
              item: "The Hitchhiker's Guide to the Galaxy",
              description:
                "A sci-fi comedy classic that matches your interest in humorous literature and space exploration.",
              rating: 4.5,
            },
            {
              id: 2,
              category: "Movies",
              item: "Inception",
              description:
                "A mind-bending thriller that aligns with your love for complex plotlines and sci-fi elements.",
              rating: 4.8,
            },
            {
              id: 3,
              category: "Music",
              item: "Daft Punk - Random Access Memories",
              description:
                "An electronic music album that combines elements of disco and funk, matching your interest in innovative sound design.",
              rating: 4.7,
            },
            {
              id: 4,
              category: "Restaurants",
              item: "The Green Spatula",
              description:
                "A farm-to-table restaurant that serves organic dishes, aligning with your interest in healthy eating and sustainable food practices.",
              rating: 4.2,
            },
            {
              id: 5,
              category: "Hobbies",
              item: "Urban Sketching",
              description:
                "A creative outdoor activity that combines your interests in art and exploring your local environment.",
              rating: 4.6,
            },
          ];
          setRecommendations(dummyRecommendations);
        }
      } catch (error) {
        console.error("Error fetching user profile or recommendations:", error);
      }
    };

    fetchUserAndRecommendations();
  }, []);

  const renderRecommendationsList = () => (
    <div style={{ maxWidth: "800px", margin: "0 auto", padding: "20px" }}>
      <h1 style={{ color: "var(--primary-color)", marginBottom: "20px" }}>
        <FaLightbulb style={{ marginRight: "10px" }} />
        Daily Recommendations
      </h1>
      <p style={{ marginBottom: "20px", color: "var(--text-color)" }}>
        Based on your interests, our AI suggests the following recommendations
        for you today:
      </p>
      {recommendations.map((rec) => (
        <div
          key={rec.id}
          style={{
            background: "var(--surface-color)",
            borderRadius: "15px",
            padding: "20px",
            marginBottom: "20px",
            boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
          }}>
          <h2 style={{ color: "var(--secondary-color)", marginBottom: "10px" }}>
            {rec.category}
          </h2>
          <h3 style={{ color: "var(--primary-color)", marginBottom: "10px" }}>
            {rec.item}
          </h3>
          <p style={{ color: "var(--text-color)", marginBottom: "10px" }}>
            {rec.description}
          </p>
          <div style={{ display: "flex", alignItems: "center" }}>
            <FaStar style={{ color: "#FFD700", marginRight: "5px" }} />
            <span style={{ color: "var(--text-color)" }}>
              {rec.rating.toFixed(1)}
            </span>
          </div>
        </div>
      ))}
    </div>
  );

  const renderUpgradeMessage = () => (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "rgba(255, 255, 255, 0.9)",
        zIndex: 10,
      }}>
      <FaLock
        size={50}
        style={{ color: "var(--primary-color)", marginBottom: "20px" }}
      />
      <h2 style={{ marginBottom: "20px" }}>
        Upgrade to Access AI Recommendations
      </h2>
      <p style={{ marginBottom: "20px", textAlign: "center", maxWidth: "80%" }}>
        Unlock personalized AI-powered recommendations by upgrading to our
        Premium plan.
      </p>
      <button
        onClick={() => {
          /* Navigate to upgrade page */
        }}
        style={{
          background: "var(--primary-color)",
          color: "white",
          border: "none",
          borderRadius: "25px",
          padding: "10px 20px",
          fontSize: "16px",
          cursor: "pointer",
        }}>
        Upgrade to Premium
      </button>
    </div>
  );

  if (!user) {
    return <Loading />;
  }

  return (
    <div style={{ position: "relative", height: "100%" }}>
      {PaymentTier[user.payment_tier as unknown as keyof typeof PaymentTier] ===
        PaymentTier.Premium ||
      PaymentTier[user.payment_tier as unknown as keyof typeof PaymentTier] ===
        PaymentTier.Owner ? (
        renderRecommendationsList()
      ) : (
        <>
          <div style={{ filter: "blur(5px)", pointerEvents: "none" }}>
            {renderRecommendationsList()}
          </div>
          {renderUpgradeMessage()}
        </>
      )}
    </div>
  );
};

export default Recommendations;
