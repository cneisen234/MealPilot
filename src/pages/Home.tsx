import React from "react";
import { Link } from "react-router-dom";
import {
  FaUtensils,
  FaCalendar,
  FaCamera,
  FaMicrophone,
  FaChartLine,
  FaShoppingCart,
} from "react-icons/fa";
import "../styles/home.css";

const Home: React.FC = () => {
  return (
    <div className="mealpilot-home" style={{ marginBottom: 100 }}>
      <div className="mealpilot-home__container">
        <div className="mealpilot-home__content">
          <div className="mealpilot-home__logo-wrapper">
            <img
              src="/MealPilot-icon-transparent.png"
              alt="MealSphere"
              className="mealpilot-home__logo"
            />
            <div className="mealpilot-home__brand">MealSphere</div>
          </div>

          <h1 className="mealpilot-home__title">
            Your Holistic
            <span className="mealpilot-home__title-accent">
              Kitchen Solution
            </span>
          </h1>

          <p className="mealpilot-home__description">
            Unleash the power of AI to effortlessly streamline your kitchen.
            From personalized meal planning to intelligent pantry management,
            MealSphere is your personal chef, grocery assistant, and meal
            architect—all in one.
          </p>

          <Link to="/signup" className="mealpilot-home__cta">
            Start your 30 Day Free Trial
          </Link>
          <p>No credit card required</p>

          <div className="mealpilot-home__auth-links">
            <Link
              to="/login"
              className="mealpilot-home__auth-link"
              style={{ textDecoration: "underline" }}>
              Login
            </Link>
            <Link
              to="/signup"
              className="mealpilot-home__auth-link"
              style={{ textDecoration: "underline" }}>
              Sign Up
            </Link>
          </div>

          <div className="mealpilot-home__features">
            {[
              {
                icon: <FaUtensils />,
                title: "Personalized Recipe Creation",
                description: (
                  <ul>
                    <li>Custom recipes based on your diet and preferences</li>
                    <li>From food allergies to lifestyle choices - we adapt</li>
                    <li>Save and edit your favorite recipes</li>
                    <li>Import recipes from photos or websites</li>
                    <li>Preserve family recipes digitally</li>
                  </ul>
                ),
              },
              {
                icon: <FaCalendar />,
                title: "One-Click Meal Planning",
                description: (
                  <ul>
                    <li>Generate weekly meal plans instantly</li>
                    <li>Personalized breakfast, lunch, and dinner options</li>
                    <li>Mix favorites with new recipes</li>
                    <li>Smart meal timing suggestions</li>
                    <li>Easy meal swapping</li>
                  </ul>
                ),
              },
              {
                icon: <FaCamera />,
                title: "Effortless Kitchen Management",
                description: (
                  <ul>
                    <li>Update inventory with photos or voice</li>
                    <li>No barcode scanning needed</li>
                    <li>Scan receipts for instant updates</li>
                    <li>Minimal manual entry</li>
                    <li>Smart item recognition</li>
                  </ul>
                ),
              },
            ].map((feature, index) => (
              <div key={index} className="mealpilot-home__feature">
                <div className="mealpilot-home__feature-icon">
                  {feature.icon}
                </div>
                <h3 className="mealpilot-home__feature-title">
                  {feature.title}
                </h3>
                <div className="mealpilot-home__feature-text">
                  {feature.description}
                </div>
              </div>
            ))}
          </div>
          <br />
          <h2 className="mealpilot-home__section-title">
            Everything Works Together
          </h2>
          <div className="mealpilot-home__features">
            {[
              {
                icon: <FaShoppingCart />,
                title: "True Recipe Integration",
                description: (
                  <ul>
                    <li>Instant pantry-to-recipe matching</li>
                    <li>Smart expiration alerts with recipe ideas</li>
                    <li>Seamless recipe-inventory sync</li>
                    <li>Never miss an ingredient</li>
                  </ul>
                ),
              },
              {
                icon: <FaChartLine />,
                title: "Inventory Tracking",
                description: (
                  <ul>
                    <li>Track expiration dates</li>
                    <li>Auto-updating quantities</li>
                    <li>Organized pantry tracking</li>
                    <li>Smart stock management</li>
                  </ul>
                ),
              },
              {
                icon: <FaMicrophone />,
                title: "Voice & Photo Integration",
                description: (
                  <ul>
                    <li>Hands-free updates</li>
                    <li>Quick photo detection</li>
                    <li>Natural voice commands</li>
                    <li>Fast visual recognition</li>
                    <li>Works across all features</li>
                  </ul>
                ),
              },
            ].map((feature, index) => (
              <div key={index} className="mealpilot-home__feature">
                <div className="mealpilot-home__feature-icon">
                  {feature.icon}
                </div>
                <h3 className="mealpilot-home__feature-title">
                  {feature.title}
                </h3>
                <div className="mealpilot-home__feature-text">
                  {feature.description}
                </div>
              </div>
            ))}
          </div>
          <br />
          <div className="mealpilot-home__closing-section">
            <h2 className="mealpilot-home__closing-title">
              Stop Wasting Food. Start Saving Time.
            </h2>
            <div className="mealpilot-home__feature">
              <p className="mealpilot-home__feature-text">
                The average household throws away $1,500 worth of food every
                year because of poor planning and expired ingredients. Over 5
                hours a week are spent on meal planning and management. These
                factors are compounded if you have unique dietary restrictions.
                MealSphere doesn't just help you plan meals - it actively works
                to save you money, time, and stress. by making sure nothing,
                including your time, goes to waste. Ready to turn your kitchen
                into a well-oiled machine?
              </p>
            </div>
            <br />
            <Link to="/signup" className="mealpilot-home__cta">
              Start Today
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
