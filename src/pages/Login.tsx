import React, { useState, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { login, checkEmailExists } from "../utils/api";
import { useAuth } from "../context/AuthContext";
import { FaExclamationCircle } from "react-icons/fa";
import { InputWithPasswordToggle } from "../components/auth/InputWithPasswordToggle";
import { useToast } from "../context/ToastContext";

const Login: React.FC = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailError, setEmailError] = useState("");
  const [loginError, setLoginError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { login: authLogin, checkAuthStatus } = useAuth();

  const checkEmail = useCallback(async (email: string) => {
    if (email) {
      try {
        const response = await checkEmailExists(email.toLowerCase());
        setEmailError(
          response.data.exists
            ? ""
            : "No account found with this email address."
        );
      } catch (error) {
        console.error("Error checking email:", error);
      }
    }
  }, []);

  const handleEmailBlur = () => {
    checkEmail(email);
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (emailError) {
      setLoginError("Please fix the errors before submitting.");
      return;
    }

    try {
      const response = await login({ email: email.toLowerCase(), password });
      localStorage.setItem("token", response.data);
      console.log(response.data);
      authLogin(
        response.data.token,
        response.data.user.ai_actions,
        response.data.user.has_subscription
      );
      checkAuthStatus();
      showToast("Successfully logged in!", "success");
      navigate("/recipe", { state: { fromLogin: true } });
    } catch (error) {
      showToast("Invalid email or password", "error");
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
                marginBottom: "0",
                marginTop: "0px",
              }}>
              MealSphere
            </h2>
          </div>
          <form onSubmit={(e) => handleSubmit(e)}>
            <div className="form-group">
              <input
                type="email"
                className={`form-control ${emailError ? "is-invalid" : ""}`}
                placeholder="Email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setEmailError(""); // Clear email error when user starts typing again
                }}
                onBlur={handleEmailBlur}
                required
              />
              {emailError && (
                <div
                  style={{
                    backgroundColor: "rgba(220, 53, 69, 0.1)",
                    border: "1px solid rgba(220, 53, 69, 0.3)",
                    borderRadius: "4px",
                    padding: "8px 12px",
                    marginTop: "15px",
                    marginBottom: "15px",
                    fontSize: "0.875rem",
                    color: "#dc3545",
                    display: "flex",
                    alignItems: "center",
                  }}>
                  <FaExclamationCircle style={{ marginRight: "8px" }} />
                  <div className="invalid-feedback">{emailError}</div>
                </div>
              )}
            </div>
            <div className="form-group">
              <InputWithPasswordToggle
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                showPassword={showPassword}
                onToggle={togglePasswordVisibility}
              />
            </div>
            {loginError && (
              <div
                style={{
                  backgroundColor: "rgba(220, 53, 69, 0.1)",
                  border: "1px solid rgba(220, 53, 69, 0.3)",
                  borderRadius: "4px",
                  padding: "8px 12px",
                  marginTop: "15px",
                  marginBottom: "15px",
                  fontSize: "0.875rem",
                  color: "#dc3545",
                  display: "flex",
                  alignItems: "center",
                }}>
                <FaExclamationCircle style={{ marginRight: "8px" }} />
                {loginError}
              </div>
            )}
            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: "100%" }}>
              Login
            </button>
          </form>
          <p style={{ marginTop: "20px", textAlign: "center" }}>
            <Link to="/signup" className="auth-link">
              Sign up here
            </Link>
          </p>
          <p style={{ textAlign: "center" }}>
            <Link to="/forgot-password" className="auth-link">
              Forgot your password?
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
