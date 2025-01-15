import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { resetPassword } from "../../utils/api";
import { InputWithPasswordToggle } from "./InputWithPasswordToggle";
import { useToast } from "../../context/ToastContext";

const ResetPassword: React.FC = () => {
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
      await resetPassword(token, password);
      showToast("Password reset successful. Please log in.", "success");
      setTimeout(() => navigate("/login"), 2000);
    } catch (error) {
      showToast("Error resetting password. Please try again.", "error");
    }
  };

  return (
    <div className="center-container">
      <div className="content-wrapper">
        <div className="auth-form">
          <h2>Reset Password</h2>
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

export default ResetPassword;
