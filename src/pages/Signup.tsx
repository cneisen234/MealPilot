import React from "react";
import { Link, useParams } from "react-router-dom"; // Add useParams
import SignupForm from "../components/auth/SignupForm";

const Signup: React.FC = () => {
  const { referralCode } = useParams(); // Get referral code from URL

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
            </h2>
          </div>
          {/*@ts-ignore*/}
          <SignupForm referralCode={referralCode} />
          <p style={{ marginTop: "20px", textAlign: "center" }}>
            <Link to="/login" className="auth-link">
              Log in here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Signup;
