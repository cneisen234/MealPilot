import React, { useState, useEffect } from "react";
import { FaStar, FaLightbulb, FaThermometerHalf } from "react-icons/fa";
import AnimatedTechIcon from "../components/common/AnimatedTechIcon";
import { User } from "../types";
import { getProfile } from "../utils/api";
import { useNavigate } from "react-router-dom";

const Recipe: React.FC = () => {
  const [user] = useState<User | null>(null);
  const [isLoading] = useState(false);

  const renderRecipeList = () => (
    <div style={{ maxWidth: "800px", margin: "0 auto", padding: "10px" }}></div>
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
      {renderRecipeList()}
    </div>
  );
};

export default Recipe;
