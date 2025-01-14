import React from "react";
import { Link } from "react-router-dom";
import {
  FaUtensils,
  FaHeart,
  FaLeaf,
  FaClipboardList,
  FaCalendar,
} from "react-icons/fa";
import "../styles/home.css";

const Home: React.FC = () => {
  return (
    <div className="mealpilot-home">
      <div className="mealpilot-home__container">
        <div className="mealpilot-home__content">
          <div className="mealpilot-home__logo-wrapper">
            <img
              src="/MealPilot-icon-transparent.png"
              alt="MealPilot"
              className="mealpilot-home__logo"
            />
          </div>

          <h1 className="mealpilot-home__title">
            Your Personal Recipe
            <span className="mealpilot-home__title-accent">
              Adventure Awaits
            </span>
          </h1>

          <p className="mealpilot-home__description">
            Your holistic kitchen solution that combines AI-powered suggestions
            with your own culinary creativity. Plan meals, manage ingredients,
            and explore new recipes with ease.
          </p>

          <Link to="/signup" className="mealpilot-home__cta">
            Start Cooking
          </Link>

          <div className="mealpilot-home__auth-links">
            <Link to="/login" className="mealpilot-home__auth-link">
              Login
            </Link>
            <Link to="/signup" className="mealpilot-home__auth-link">
              Sign Up
            </Link>
          </div>

          <div className="mealpilot-home__features">
            {[
              {
                icon: <FaUtensils />,
                title: "Smart Recipe Management",
                description:
                  "Generate AI-powered recipes or easily import your favorites from websites and photos. Customize everything to make it yours.",
              },
              {
                icon: <FaCalendar />,
                title: "Dynamic Meal Planning",
                description:
                  "Create weekly meal plans that blend your saved recipes with new AI suggestions, perfectly balanced for your dietary needs.",
              },
              {
                icon: <FaClipboardList />,
                title: "Effortless Inventory",
                description:
                  "Track inventory and shopping lists with ease. Scan receipts, take photos, or add items manually - whatever works for you.",
              },
            ].map((feature, index) => (
              <div key={index} className="mealpilot-home__feature">
                <div className="mealpilot-home__feature-icon">
                  {feature.icon}
                </div>
                <h3 className="mealpilot-home__feature-title">
                  {feature.title}
                </h3>
                <p className="mealpilot-home__feature-text">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
