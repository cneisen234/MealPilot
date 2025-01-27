import React from "react";
import { Link } from "react-router-dom";
import {
  FaUtensils,
  FaClipboardList,
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
                description:
                  "Tell us your dietary restrictions, preferences, and must-have ingredients. Our AI creates custom recipes that perfectly match your needs - whether you want gluten-free, need high-protein meals, or prefer specific cuisines. Save your recipes, customize them, and even add your own personal recipes with a snap of a photo. Have a cookbook laying around? Just take a picture of a favorite recipe and it's in the app and integrated into the system!",
              },
              {
                icon: <FaCalendar />,
                title: "One-Click Meal Planning",
                description:
                  "Generate a complete week of balanced meals with a single click. Get breakfast, lunch, and dinner plans that work together. Generate a mix from your saved recipes as well as recommendations for new ones. Our system intelligently knows the difference between breakfast, lunch, and dinner and creates a meal plan with appropriate meals. Don't like a suggestion? Simply swap it with another recipe that fits your plan.",
              },
              {
                icon: <FaCamera />,
                title: "Effortless Kitchen Management",
                description:
                  "Simply take a photo of your groceries or speak into the app to update your inventory. No barcode scanning needed. Take photos of receipts to update your shopping list and inventory seemlessly. Almost no manual entry required! The same easy process works for building shopping lists and finding items you already have. Our system searches your list for matches based solely on the content of the photo, and knows what to look for to find a match!",
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
          <br />
          <h2 className="mealpilot-home__section-title">
            Everything Works Together
          </h2>
          <div className="mealpilot-home__features">
            {[
              {
                icon: <FaShoppingCart />,
                title: "True Recipe Integration",
                description:
                  "Check recipe ingredients against your pantry with one click. Get alerts when items are expiring with suggestions for saved recipes that use them. Every feature communicates - your recipes know your inventory, and your inventory knows your recipes.",
              },
              {
                icon: <FaChartLine />,
                title: "Inventory Tracking",
                description:
                  "Track expiration dates, get alerts about low items, and automatically update quantities when you cook. Your pantry stays organized without the hassle.",
              },
              {
                icon: <FaMicrophone />,
                title: "Voice & Photo Integration",
                description:
                  "Use voice commands or photos to find items, add to shopping lists, or update inventory. The AI understands context and matches items intelligently.",
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
          <div className="mealpilot-home__closing-section">
            <h2 className="mealpilot-home__closing-title">
              Stop Wasting Food. Start Saving Time.
            </h2>
            <p className="mealpilot-home__feature">
              The average household throws away $1,500 worth of food every year
              because of poor planning and expired ingredients. Over 5 hours a
              week are spent on meal planning and management. These factors are
              compounded if you have unique dietary restrictions. MealSphere
              doesn't just help you plan meals - it actively works to save you
              money, time, and stress. by making sure nothing, including your
              time, goes to waste. Ready to turn your kitchen into a well-oiled
              machine?
            </p>
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
