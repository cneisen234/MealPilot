import React, { useState, useEffect } from "react";
import { FaStar, FaLightbulb } from "react-icons/fa";
import AnimatedTechIcon from "../components/animatedTechIcon";
import { User, PaymentTier, Recommendation } from "../types";
import { getProfile, getDailyRecommendations } from "../utils/api";

const Recommendations: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [lastFetchDate, setLastFetchDate] = useState<string | null>(null);

  useEffect(() => {
    fetchUserAndRecommendations();
  }, []);

  const fetchUserAndRecommendations = async () => {
    try {
      setIsLoading(true);
      const userResponse = await getProfile();
      setUser(userResponse.data);

      if (
        PaymentTier[
          userResponse.data.payment_tier as unknown as keyof typeof PaymentTier
        ] === PaymentTier.Premium ||
        PaymentTier[
          userResponse.data.payment_tier as unknown as keyof typeof PaymentTier
        ] === PaymentTier.Owner
      ) {
        await fetchDailyRecommendations();
      }
    } catch (error) {
      console.error("Error fetching user profile or recommendations:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchDailyRecommendations = async () => {
    const currentDate = new Date().toISOString().split("T")[0];

    // Check if we've already fetched recommendations today
    if (lastFetchDate === currentDate && recommendations.length > 0) {
      return; // Use cached recommendations
    }

    try {
      const response = await getDailyRecommendations();
      setRecommendations(response.data);
      setLastFetchDate(currentDate);
    } catch (error) {
      console.error("Error fetching daily recommendations:", error);
    }
  };

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

  if (isLoading || !user) {
    return <AnimatedTechIcon size={100} speed={10} />;
  }

  return (
    <div style={{ position: "relative", height: "100%" }}>
      {PaymentTier[user.payment_tier as unknown as keyof typeof PaymentTier] ===
        PaymentTier.Premium ||
      PaymentTier[user.payment_tier as unknown as keyof typeof PaymentTier] ===
        PaymentTier.Owner ? (
        renderRecommendationsList()
      ) : (
        <div>Upgrade to premium to access daily recommendations!</div>
      )}
    </div>
  );
};

export default Recommendations;
