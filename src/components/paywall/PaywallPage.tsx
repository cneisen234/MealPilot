import React from "react";
import { useNavigate } from "react-router-dom";
import "../../styles/paywall.css";

const PaywallPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div>
      <div className="paywall__content">
        <h1 className="paywall__title">Unlock All Features</h1>
        <p className="paywall__description">
          Get access to all of MealSphere's powerful features including:
        </p>
        <ul className="paywall__features">
          <li>AI-powered recipe generation based on your preferences</li>
          <li>Smart inventory management with expiration tracking</li>
          <li>Intelligent shopping lists with receipt scanning</li>
        </ul>
        <div className="paywall__cta">
          <button
            onClick={() => navigate("/account-settings")}
            className="paywall__button">
            Subscribe
          </button>
          <p className="paywall__price">Only $14.99/month</p>
        </div>
      </div>
    </div>
  );
};

export default PaywallPage;
