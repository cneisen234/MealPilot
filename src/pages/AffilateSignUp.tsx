import React from "react";
import { Link } from "react-router-dom";
import AffiliateSignupForm from "../components/auth/AffiliateSignUpForm";

const AffiliateSignup: React.FC = () => {
  return (
    <div className="center-container">
      <div className="content-wrapper">
        <div className="auth-form">
          <div
            style={{
              textAlign: "center",
              marginBottom: "24px",
            }}>
            <img
              src="/MealPilot-icon-transparent.png"
              alt="MealSphere"
              style={{
                width: "64px",
                height: "64px",
              }}
            />
            <h2
              style={{
                background:
                  "linear-gradient(45deg, var(--primary-color) 35%, var(--secondary-color) 85%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
                color: "transparent",
                marginBottom: "0",
                marginTop: "11px",
              }}>
              MealSphere
              <br /> Affiliate Program
            </h2>
          </div>
          <AffiliateSignupForm />
          <p style={{ marginTop: "20px", textAlign: "center" }}>
            <Link to="/affiliate/login" className="auth-link">
              Already have an affiliate account? Log in here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default AffiliateSignup;
