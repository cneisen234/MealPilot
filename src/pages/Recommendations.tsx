import React, { useState, useEffect } from "react";
import { FaStar, FaLightbulb, FaThermometerHalf, FaLock } from "react-icons/fa";
import AnimatedTechIcon from "../components/common/AnimatedTechIcon";
import { User, PaymentTier, Recommendation } from "../types";
import { getProfile, getDailyRecommendations } from "../utils/api";
import { useNavigate } from "react-router-dom";

const Recommendations: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [lastFetchDate, setLastFetchDate] = useState<string | null>(null);
  const navigate = useNavigate();

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

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 8) return "green";
    if (confidence >= 5) return "orange";
    return "red";
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

  const removeStars = (text: string): string => {
    return text.replace(/^\*\*|\*\*$/g, "").trim();
  };

  const removeRatingFromDescription = (text: string): string => {
    return text.replace(/\s*\/10\s*$/, "").trim();
  };

  const renderRecommendationsList = () => (
    <div style={{ maxWidth: "800px", margin: "0 auto", padding: "10px" }}>
      <h2 style={{ color: "var(--primary-color)", marginBottom: "20px" }}>
        <FaLightbulb style={{ marginRight: "10px" }} />
        Daily Recommendations
      </h2>
      <p
        style={{
          marginBottom: "20px",
          color: "var(--text-color)",
          fontSize: "1em",
        }}>
        Based on your interests, Lena suggests the following recommendations for
        you today:
      </p>
      <p
        style={{
          marginBottom: "20px",
          color: "var(--text-color)",
          fontSize: "0.5em",
        }}>
        <strong>Disclaimer:</strong> AI responses may be inaccurate. We're
        continually improving, but some inaccuracies may persist.
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
            {removeStars(rec.category)}
          </h2>
          <h3 style={{ color: "var(--primary-color)", marginBottom: "10px" }}>
            {rec.item}
          </h3>
          <p style={{ color: "var(--text-color)", marginBottom: "10px" }}>
            {removeRatingFromDescription(rec.description)}
          </p>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              width: "100%",
            }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                width: 100,
              }}>
              <FaStar style={{ color: "#FFD700", marginRight: "5px" }} />
              <span style={{ color: "var(--text-color)" }}>
                {rec.rating.toFixed(1)}
              </span>
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                alignItems: "center",
                width: 200,
              }}>
              <FaThermometerHalf
                style={{
                  color: getConfidenceColor(rec.confidence),
                  marginRight: "5px",
                }}
              />
              <span style={{ color: getConfidenceColor(rec.confidence) }}>
                Confidence: {rec.confidence}/10
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  if (isLoading || !user) {
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

  return (
    <div style={{ position: "relative", height: "100%" }}>
      {PaymentTier[user.payment_tier as unknown as keyof typeof PaymentTier] ===
        PaymentTier.Premium ||
      PaymentTier[user.payment_tier as unknown as keyof typeof PaymentTier] ===
        PaymentTier.Owner ? (
        renderRecommendationsList()
      ) : (
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
          <h2 style={{ marginBottom: "0px" }}>Upgrade to Premium</h2>
          <h3 style={{ marginBottom: "20px" }}>
            To Access Daily Recommendations
          </h3>
          <p
            style={{
              marginBottom: "20px",
              textAlign: "center",
              maxWidth: "80%",
              fontSize: "1em",
            }}>
            Unlock access to daily personalized recommendations based on your
            interests and location.
          </p>
          <button
            onClick={() => {
              navigate("/upgrade");
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
            Upgrade Now
          </button>
        </div>
      )}
    </div>
  );
};

export default Recommendations;
