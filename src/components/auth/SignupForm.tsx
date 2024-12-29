import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { signup, login, checkEmailAvailability } from "../../utils/api";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import { useAuth } from "../../context/AuthContext";
import useDebounce from "../../hooks/useDebounce";
import { emailFormatValidationHelper } from "../../helpers/emailFormatValidationHelper";
import {
  getPasswordValidationErrors,
  passwordValidationHelper,
} from "../../helpers/passwordValidationHelper";

const SignupForm: React.FC = () => {
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string[]>([]);
  const [emailError, setEmailError] = useState("");
  const [usernameError, setUsernameError] = useState("");
  const [generalError, setGeneralError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const { checkAuthStatus } = useAuth();

  const debouncedEmail = useDebounce(email, 300);
  const debouncedUsername = useDebounce(username, 300);

  const checkEmail = useCallback(async (email: string) => {
    if (email) {
      try {
        const response = await checkEmailAvailability(email.toLowerCase());
        setEmailError(
          response.data.available ? "" : "This email is already taken."
        );
      } catch (error) {
        console.error("Error checking email availability:", error);
      }
    }
  }, []);

  useEffect(() => {
    checkEmail(debouncedEmail);
  }, [debouncedEmail, checkEmail]);

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeneralError("");

    if (emailError || usernameError || passwordError.length > 0) {
      setGeneralError("Please fix the errors before submitting.");
      return;
    }

    try {
      // Final check before submission
      const emailAvailable = await checkEmailAvailability(email);

      if (!emailFormatValidationHelper(email)) {
        setEmailError("Email address needs to be in correct format.");
        setGeneralError("Please fix the errors before submitting.");
        return;
      }
      if (!emailAvailable.data.available) {
        setEmailError("This email is already taken.");
        setGeneralError("Please fix the errors before submitting.");
        return;
      }

      if (!passwordValidationHelper(password)) {
        setPasswordError(getPasswordValidationErrors(password));
        setGeneralError("Please fix the errors before submitting.");
        return;
      }

      // Proceed with signup
      await signup({
        name,
        username,
        email: email.toLowerCase(),
        password,
      });

      // Login
      const loginResponse = await login({ email, password });

      // Store the token
      localStorage.setItem("token", loginResponse.data.token);

      // Update auth status
      checkAuthStatus();

      // Redirect to onboarding page
      navigate("/onboarding");
    } catch (error) {
      console.error("Signup error", error);
      setGeneralError("An error occurred during signup. Please try again.");
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="form-group">
        <input
          type="text"
          placeholder="Name"
          className="form-control"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </div>
      <div className="form-group">
        <input
          type="text"
          className={`form-control ${usernameError ? "is-invalid" : ""}`}
          onFocus={() => setUsernameError("")}
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
        />
        {usernameError && (
          <div className="invalid-feedback">{usernameError}</div>
        )}
      </div>
      <div className="form-group">
        <input
          type="email"
          className={`form-control ${emailError ? "is-invalid" : ""}`}
          onFocus={() => setEmailError("")}
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        {emailError && <div className="invalid-feedback">{emailError}</div>}
      </div>
      <div className="form-group">
        <input
          type={showPassword ? "text" : "password"}
          className={`form-control ${
            passwordError.length > 0 ? "is-invalid" : ""
          }`}
          onFocus={() => setPasswordError([])}
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <button
          type="button"
          onClick={togglePasswordVisibility}
          style={{
            float: "right",
            paddingBottom: 45,
            paddingRight: 15,
            transform: "translateY(-50%)",
            background: "none",
            border: "none",
            cursor: "pointer",
          }}>
          {showPassword ? <FaEye size={20} /> : <FaEyeSlash size={20} />}
        </button>
      </div>
      {passwordError.length > 0 && (
        <div className="invalid-feedback">
          {passwordError.map((error, index) => (
            <div key={index}>{error}</div>
          ))}
        </div>
      )}
      {generalError && <div className="alert alert-danger">{generalError}</div>}
      <button
        type="submit"
        className="btn btn-primary"
        style={{ width: "100%" }}>
        Sign Up
      </button>
    </form>
  );
};

export default SignupForm;
