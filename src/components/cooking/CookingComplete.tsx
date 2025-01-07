import React from "react";
import { FaCheckCircle, FaArrowLeft } from "react-icons/fa";

interface CookingCompleteProps {
  recipeName: string;
  onFinish: () => void;
}

const CookingComplete: React.FC<CookingCompleteProps> = ({
  recipeName,
  onFinish,
}) => {
  return (
    <div className="recipe-result">
      <div className="recipe-section cooking-complete-section">
        {/* Success indicator */}
        <div className="cooking-complete-icon">
          <FaCheckCircle className="success-icon" size={64} />
        </div>

        <h2 className="cooking-complete-title">Cooking Complete!</h2>

        <p className="cooking-complete-message">
          You've successfully completed cooking {recipeName}. We hope it is
          delicious!
        </p>

        {/* Action buttons using existing styles */}
        <div className="cooking-complete-actions">
          {/* Return to recipe button */}
          <button
            onClick={onFinish}
            className="recipe-action-button back-button button-with-icon">
            <FaArrowLeft />
            <span>Exit Cooking Mode</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default CookingComplete;
