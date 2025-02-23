import React, { useState } from "react";
import { Link } from "react-router-dom";
import { requestAffiliatePasswordReset } from "../../utils/api";
import { useToast } from "../../context/ToastContext";

const AffiliateForgotPassword: React.FC = () => {
  const { showToast } = useToast();
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await requestAffiliatePasswordReset(email);
      showToast(
        "Password reset email sent. Please check your inbox.",
        "success"
      );
    } catch (error) {
      showToast("Error sending reset email. Please try again.", "error");
    }
  };

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
                marginBottom: "12px",
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
                marginBottom: "20px",
                marginTop: "0px",
              }}>
              Reset Affiliate Password
            </h2>
          </div>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <input
                type="email"
                className="form-control"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your affiliate email"
                required
              />
            </div>
            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: "100%" }}>
              Reset Password
            </button>
          </form>
          {message && <p className="mt-3 text-center">{message}</p>}
          <p style={{ marginTop: "20px", textAlign: "center" }}>
            <Link to="/affiliate/login" className="auth-link">
              Back to Affiliate Login
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default AffiliateForgotPassword;
