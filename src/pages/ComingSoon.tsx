import React from "react";
import { FaUsers, FaMobileAlt, FaGift } from "react-icons/fa";
import { FaHeartCirclePlus } from "react-icons/fa6";
import { VscLightbulbSparkle } from "react-icons/vsc";
import "../styles/comingsoon.css";

const ComingSoon: React.FC = () => {
  const features = [
    {
      icon: <FaUsers />,
      title: "Geolocation search for likeminded people",
      description:
        "We are adding a feature that uses geolocation to find people near you that have similar interests. This will allow you to ask the AI if there's anyone near you that might enjoy a specific activity or event [or really anything]. The AI will use geolocation to search for people and then allow you to prompt them in the app",
    },
    {
      icon: <FaHeartCirclePlus />,
      title: "Add interests from chat",
      description:
        "We are working on creating a feature where you can add the AI's suggestions as interest items on your profile with the click of a button",
    },
    {
      icon: <FaMobileAlt />,
      title: "Mobile App",
      description:
        "Take VibeQuest on the go with our upcoming mobile application for iOS and Android.",
    },
    {
      icon: <VscLightbulbSparkle />,
      title: "Suggested Prompts",
      description:
        "Allow our AI to suggest questions and prompts for you for the moments where you're not quite sure what to say.",
    },
    {
      icon: <FaGift />,
      title: "Gift a Plan to a Friend",
      description: "Create the ability to buy a free month for a friend",
    },
  ];

  return (
    <div className="enhanced-coming-soon-container">
      <h1 className="enhanced-coming-soon-title">Coming Soon to VibeQuest</h1>
      <p className="enhanced-coming-soon-description">
        We're constantly working to enhance your quest. Check out these exciting
        features on the horizon!
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
