import React, { useState, useEffect } from "react";
import RecommendationList from "../components/recommendations/RecommendationList";
import { Recommendation } from "../types";
import { getRecommendations } from "../utils/api";

const Recommendations: React.FC = () => {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);

  useEffect(() => {
    const fetchRecommendations = async () => {
      try {
        const response = await getRecommendations(1); // Assuming user ID 1 for now
        setRecommendations(response.data);
      } catch (error) {
        console.error("Error fetching recommendations:", error);
      }
    };

    fetchRecommendations();
  }, []);

  return (
    <div>
      <h1>Your Recommendations</h1>
      <RecommendationList recommendations={recommendations} />
    </div>
  );
};

export default Recommendations;
