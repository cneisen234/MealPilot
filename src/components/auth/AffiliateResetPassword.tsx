import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { resetAffiliatePassword } from "../../utils/api";
import { InputWithPasswordToggle } from "./InputWithPasswordToggle";
import { useToast } from "../../context/ToastContext";

const AffiliateResetPassword: React.FC = () => {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setMessage("Passwords do not match");
      return;
    }
    try {
      if (!token) {
        throw new Error("Reset token is missing");
      }
      await resetAffiliatePassword(token, password);
      showToast("Password reset successful. Please log in.", "success");
      setTimeout(() => navigate("/affiliate/login"), 2000);
    } catch (error) {
      showToast("Error resetting password. Please try again.", "error");
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
              <InputWithPasswordToggle
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                showPassword={showPassword}
                onToggle={togglePasswordVisibility}
              />
            </div>
            <div className="form-group">
              <input
                type={showPassword ? "text" : "password"}
                className="form-control"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm New Password"
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
        </div>
      </div>
    </div>
  );
};

export default AffiliateResetPassword;
