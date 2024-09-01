import React from "react";
import {
  FaUsers,
  FaMobileAlt,
  FaGift,
  FaThumbsDown,
  FaUserPlus,
  FaGlobe,
} from "react-icons/fa";
import { FaHeartCirclePlus } from "react-icons/fa6";
import { VscLightbulbSparkle } from "react-icons/vsc";
import "../styles/comingsoon.css";

const ComingSoon: React.FC = () => {
  const features = [
    {
      icon: <FaUsers />,
      title: "Suggested Friends",
      description:
        "Use Lena combined with geolocation to find friends with mutual interests!",
    },
    {
      icon: <FaHeartCirclePlus />,
      title: "Add interests from chat",
      description:
        "Add Lena's suggestions as interest items on your profile with the click of a button",
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
        "Allow Lena to suggest questions and prompts for you for the moments where you're not quite sure what to say.",
    },
    {
      icon: <FaGift />,
      title: "Gift a Plan to a Friend",
      description: "Create the ability to buy a free month for a friend",
    },
    {
      icon: <FaThumbsDown />,
      title: "Dislikes List",
      description:
        "Add Dislikes as well as Likes so Lena knows what not to send your way!",
    },
    {
      icon: <FaGlobe />,
      title: "Multi Lingual",
      description:
        "Specify your language on sign up and change your language on the fly when talking to Lena! ",
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
