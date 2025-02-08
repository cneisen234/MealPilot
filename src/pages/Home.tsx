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
    <div
      className="mealpilot-home"
      style={{ marginTop: 100, marginBottom: 100 }}>
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
            Your Kitchen's{" "}
            <span className="mealpilot-home__title-accent">AI Revolution</span>
          </h1>

          <h2 className="mealpilot-home__tagline">
            Where Convenience Meets Innovation
          </h2>

          <p className="mealpilot-home__description">
            Imagine your kitchen running itself. No more "what's for dinner"
            stress. No more wasted food. No more hours spent planning meals.
            MealSphere uses advanced AI to transform your kitchen into an
            effortless cooking command center.
          </p>

          <div className="mealpilot-home__stats">
            <div className="mealpilot-home__stat">
              <span className="mealpilot-home__stat-number">$1,500</span>
              <span className="mealpilot-home__stat-text">
                Average annual food waste eliminated
              </span>
            </div>
            <div className="mealpilot-home__stat">
              <span className="mealpilot-home__stat-number">5+ Hours</span>
              <span className="mealpilot-home__stat-text">
                Weekly time saved on meal planning
              </span>
            </div>
            <div className="mealpilot-home__stat">
              <span className="mealpilot-home__stat-number">80%</span>
              <span className="mealpilot-home__stat-text">
                Reduction in meal-related stress
              </span>
            </div>
          </div>

          <div className="mealpilot-home__highlight-banner">
            <span className="mealpilot-home__highlight-text">
              Kitchen management like you've never seen it before!
            </span>
          </div>

          <Link to="/signup" className="mealpilot-home__cta">
            Start Your Free 30-Day Trial
          </Link>
          <p className="mealpilot-home__no-card">No credit card required</p>

          <div className="mealpilot-home__features">
            {[
              {
                icon: <FaUtensils />,
                title: "Perfect Recipes Every Time",
                description: (
                  <ul>
                    <li>
                      AI creates recipes that match your exact dietary needs
                    </li>
                    <li>Never worry about ingredient substitutions</li>
                    <li>Automatically adjust portions for any group size</li>
                    <li>Save your favorite recipes in one place</li>
                    <li>Import recipes from photos or websites with ease</li>
                  </ul>
                ),
              },
              {
                icon: <FaCamera />,
                title: "Smart Kitchen Management",
                description: (
                  <ul>
                    <li>
                      Simply take a photo to identify ingredients - no barcodes
                      required!
                    </li>
                    <li>
                      Update your pantry by voice or photo. Completely keyboard
                      free!
                    </li>
                    <li>Know exactly what's in your kitchen at all times</li>
                    <li>Track expiration dates automatically</li>
                    <li>Never throw away forgotten food again</li>
                  </ul>
                ),
              },
              {
                icon: <FaCalendar />,
                title: "Stress-Free Meal Planning",
                description: (
                  <ul>
                    <li>
                      Get a full week of personalized meals in seconds with a
                      simple button click!
                    </li>
                    <li>No more "what's for dinner?" stress</li>
                    <li>Easily swap meals on the fly</li>
                    <li>Perfect portions every time</li>
                    <li>Save hours of weekly planning time</li>
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

          <h2 className="mealpilot-home__section-title">
            Everything Works Together
          </h2>
          <div className="mealpilot-home__features">
            {[
              {
                icon: <FaShoppingCart />,
                title: "Shopping Made Simple",
                description: (
                  <ul>
                    <li>Generate smart shopping lists instantly</li>
                    <li>Share lists with family members</li>
                    <li>Never forget an ingredient again</li>
                    <li>Scan receipts to update your pantry</li>
                  </ul>
                ),
              },
              {
                icon: <FaChartLine />,
                title: "Stay Organized Effortlessly",
                description: (
                  <ul>
                    <li>Know what's about to expire</li>
                    <li>Track everything in your kitchen</li>
                    <li>Access your data from any device</li>
                    <li>Keep your family in sync</li>
                  </ul>
                ),
              },
              {
                icon: <FaMicrophone />,
                title: "Hands-Free Kitchen Help",
                description: (
                  <ul>
                    <li>Update your kitchen by voice</li>
                    <li>Quick photo ingredient detection</li>
                    <li>Step-by-step cooking guidance</li>
                    <li>Perfect for busy cooks</li>
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

          <div className="mealpilot-home__closing-section">
            <h2 className="mealpilot-home__closing-title">
              Stop Stressing. Start Enjoying.
            </h2>
            <div className="mealpilot-home__feature">
              <p className="mealpilot-home__feature-text">
                How much time do you spend worrying about meals each week? How
                much food do you throw away because it got lost in the back of
                your fridge? How often do you struggle with dietary
                restrictions? MealSphere transforms your kitchen from a source
                of stress into a place of confidence and creativity. Ready to
                take control of your kitchen?
              </p>
            </div>
            <br />

            <Link to="/signup" className="mealpilot-home__cta">
              Start Your Free 30-Day Trial
            </Link>
            <p className="mealpilot-home__no-card">No credit card required</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
