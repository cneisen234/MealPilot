import React from "react";
import { Recommendation } from "../../types";

interface RecommendationListProps {
  recommendations: Recommendation[];
}

const RecommendationList: React.FC<RecommendationListProps> = ({
  recommendations,
}) => {
  return (
    <ul style={{ listStyleType: "none", padding: 0 }}>
      {recommendations.map((rec, index) => (
        <li
          key={index}
          style={{
            marginBottom: "10px",
            border: "1px solid #ddd",
            padding: "10px",
            borderRadius: "5px",
          }}>
          <h3>{rec.category}</h3>
          <p>{rec.recommendation}</p>
        </li>
      ))}
    </ul>
  );
};

export default RecommendationList;
