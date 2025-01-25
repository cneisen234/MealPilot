import React from "react";
import { Link } from "react-router-dom";
import { FaUtensils, FaClipboardList, FaCalendar } from "react-icons/fa";
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
            <div className="mealpilot-home__brand">MealPilot</div>
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
            MealPilot is your personal chef, grocery assistant, and meal
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
                title: "AI-Powered Meal Planning",
                description:
                  "Let our AI create weekly meal plans tailored to your dietary preferences and nutritional goals. No more guesswork—just delicious meals that fit your lifestyle.",
              },
              {
                icon: <FaCalendar />,
                title: "Personalized Meal Scheduler",
                description:
                  "Say goodbye to the hassle of planning your meals. Automatically schedule your meals for the week, blending your favorites with new suggestions based on what's in your pantry.",
              },
              {
                icon: <FaClipboardList />,
                title: "Pantry & Inventory Management",
                description:
                  "Easily track your pantry items and grocery needs. Scan receipts, upload photos, or add items manually—MealPilot keeps you organized and helps you avoid wasteful shopping trips.",
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

          <h2
            className="mealpilot-home__cost-savings-title"
            style={{ marginTop: 100 }}>
            How MealPilot Saves You Money
          </h2>
          <div className="mealpilot-home__features">
            <div className="mealpilot-home__feature">
              <h3 className="mealpilot-home__feature-title">
                Meal Delivery Services:
              </h3>
              <p className="mealpilot-home__feature-text">
                Save up to $200/month by eliminating the need for meal kits or
                delivery subscriptions.
              </p>
            </div>
            <div className="mealpilot-home__feature">
              <h3 className="mealpilot-home__feature-title">Grocery Bills:</h3>
              <p className="mealpilot-home__feature-text">
                Save up to $150/month by only purchasing what you need, thanks
                to MealPilot's professional and truly robust pantry tracking
                system.
              </p>
            </div>
            <div className="mealpilot-home__feature">
              <h3 className="mealpilot-home__feature-title">Dining Out:</h3>
              <p className="mealpilot-home__feature-text">
                Reduce your dining-out expenses by up to $100/month by always
                having a meal plan ready to go.
              </p>
            </div>
            <div className="mealpilot-home__feature">
              <h3 className="mealpilot-home__feature-title">Time Savings:</h3>
              <p className="mealpilot-home__feature-text">
                Save up to 5 hours a week on meal planning, grocery shopping,
                and recipe organization—time you can spend enjoying your meals,
                not planning them.
              </p>
            </div>
            <div className="mealpilot-home__feature">
              <h3 className="mealpilot-home__feature-title">
                Reduced Food Waste:
              </h3>
              <p className="mealpilot-home__feature-text">
                Save up to $120/month by tracking expiration dates and planning
                meals around ingredients you already have, eliminating food
                waste entirely.
              </p>
            </div>
            <div className="mealpilot-home__feature">
              <h3 className="mealpilot-home__feature-title">
                Smart Bulk Buying:
              </h3>
              <p className="mealpilot-home__feature-text">
                Save up to $80/month by intelligently identifying bulk buying
                opportunities and tracking long-term storage items effectively.
              </p>
            </div>
          </div>
          <h2
            className="mealpilot-home__cost-savings-title"
            style={{ marginTop: 100 }}>
            Why We're Different, and Truly the Best
          </h2>
          <div className="mealpilot-home__features">
            <div className="mealpilot-home__feature">
              <h3 className="mealpilot-home__feature-title">
                All-In-One Solution
              </h3>
              <p className="mealpilot-home__feature-text">
                MealPilot does it all, with deeply integrated features that work
                together seamlessly. Instead of paying for multiple apps that
                each tackle only one aspect of the job—and do so
                poorly—MealPilot brings everything under one roof. We’ll help
                you save money on unnecessary subscriptions while providing a
                more effective solution to your kitchen needs.
              </p>
            </div>
            <div className="mealpilot-home__feature">
              <h3 className="mealpilot-home__feature-title">
                Real AI, Not Just Marketing
              </h3>
              <p className="mealpilot-home__feature-text">
                Unlike other apps that only claim to use AI, MealPilot employs
                genuine artificial intelligence that learns and adapts to your
                preferences, dietary needs, and cooking habits. Our AI
                understands the nuances of cooking, nutrition, and meal planning
                in ways that traditional apps simply cannot match.
              </p>
            </div>
            <div className="mealpilot-home__feature">
              <h2 className="mealpilot-home__feature-title">
                We're Not Just Another Recipe or Inventory App
              </h2>
              <p className="mealpilot-home__feature-text">
                MealPilot is a comprehensive kitchen solution that automates
                tasks typically handled by professional services. Our deeply
                integrated AI system combines the roles of a personal chef, meal
                planner, and pantry manager into one powerful app. We've
                perfected features that traditional apps have struggled with for
                years, saving you time, money, and effort while making your
                kitchen run smoother than ever. Finally, a solution that
                actually works!
              </p>

              <br />
              <Link to="/signup" className="mealpilot-home__cta">
                Sign Up Now and See for Yourself
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
