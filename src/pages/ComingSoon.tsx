import React from "react";
import {
  FaCalendarAlt,
  FaBoxes,
  FaListUl,
  FaBarcode,
  FaHeart,
  FaPlayCircle,
  FaShareAlt,
} from "react-icons/fa";
import "../styles/comingsoon.css";

const ComingSoon: React.FC = () => {
  const features = [
    {
      icon: <FaBoxes />,
      title: "Smart Inventory Management",
      description:
        "Keep track of your current ingredients so that our recipe generator knows what you already have on hand.",
    },
    {
      icon: <FaListUl />,
      title: "Shopping List",
      description:
        "Automatically generate shopping lists from your recipes or manually manage your grocery needs. Never forget an ingredient again!",
    },
    {
      icon: <FaBarcode />,
      title: "Barcode Scanner",
      description:
        "Quickly add items to your inventory or shopping list by scanning their barcodes, making inventory management a breeze!",
    },
    {
      icon: <FaHeart />,
      title: "Enhanced Preferences",
      description:
        "Fine-tune your recipe suggestions with expanded preference options including taste preferences, dietary goals, and cuisine types.",
    },
    {
      icon: <FaPlayCircle />,
      title: "Interactive Cooking Mode",
      description:
        "Follow recipes step-by-step with built-in timers, automatic inventory updates, and shopping list tracking.",
    },
    {
      icon: <FaShareAlt />,
      title: "Share & Print",
      description:
        "Easily share your favorite recipes with friends and family or print them from your recipe collection.",
    },
  ];

  return (
    <div className="enhanced-coming-soon-container">
      <h1 className="enhanced-coming-soon-title">Coming Soon to MealPilot</h1>
      <p className="enhanced-coming-soon-description">
        We're constantly working to enhance your experience. Check out these
        exciting features on the horizon!
      </p>
      <div className="enhanced-feature-grid">
        {features.map((feature, index) => (
          <div key={index} className="enhanced-feature-card">
            <div className="enhanced-feature-icon">{feature.icon}</div>
            <h3 className="enhanced-feature-title">{feature.title}</h3>
            <p className="enhanced-feature-description">
              {feature.description}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ComingSoon;
