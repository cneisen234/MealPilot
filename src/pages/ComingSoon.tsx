import React from "react";
import {
  FaUsers,
  FaChartLine,
  FaMobileAlt,
  FaLock,
  FaCalendarAlt,
} from "react-icons/fa";
import "../styles/comingsoon.css";

const ComingSoon: React.FC = () => {
  const features = [
    {
      icon: <FaUsers />,
      title: "Advanced Friend Matching",
      description:
        "AI-powered algorithm to connect you with like-minded individuals based on shared interests and compatibility scores.",
    },
    {
      icon: <FaChartLine />,
      title: "Interest Trends and Analytics",
      description:
        "Visualize how your interests evolve over time and compare them with global or local trends.",
    },
    {
      icon: <FaMobileAlt />,
      title: "Mobile App",
      description:
        "Take VibeQuest on the go with our upcoming mobile application for iOS and Android.",
    },
    {
      icon: <FaLock />,
      title: "Enhanced Privacy Controls",
      description:
        "Granular settings to control who sees what aspects of your profile and interests.",
    },
    {
      icon: <FaCalendarAlt />,
      title: "Interest-Based Events",
      description:
        "Automatically curated and suggested events in your area based on your unique interest profile.",
    },
  ];

  return (
    <div className="enhanced-coming-soon-container">
      <h1 className="enhanced-coming-soon-title">Coming Soon to VibeQuest</h1>
      <p className="enhanced-coming-soon-description">
        We're constantly working to improve your experience. Check out these
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
      <div className="enhanced-notification-section">
        <p className="enhanced-notification-text">
          Excited about these upcoming features? Stay tuned for updates!
        </p>
        <button className="enhanced-notify-button">Get Notified</button>
      </div>
    </div>
  );
};

export default ComingSoon;
