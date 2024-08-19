import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  signup,
  login,
  checkEmailAvailability,
  checkUsernameAvailability,
} from "../../utils/api";
import { useAuth } from "../../context/AuthContext";
import useDebounce from "../../hooks/useDebounce";
import { emailFormatValidationHelper } from "../../helpers/emailFormatValidationHelper";

const SignupForm: React.FC = () => {
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailError, setEmailError] = useState("");
  const [usernameError, setUsernameError] = useState("");
  const [generalError, setGeneralError] = useState("");
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

  const checkUsername = useCallback(async (username: string) => {
    if (username) {
      try {
        const response = await checkUsernameAvailability(username);
        setUsernameError(
          response.data.available ? "" : "This username is already taken."
        );
      } catch (error) {
        console.error("Error checking username availability:", error);
      }
    }
  }, []);

  useEffect(() => {
    checkEmail(debouncedEmail);
  }, [debouncedEmail, checkEmail]);

  useEffect(() => {
    checkUsername(debouncedUsername);
  }, [debouncedUsername, checkUsername]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeneralError("");

    if (emailError || usernameError) {
      setGeneralError("Please fix the errors before submitting.");
      return;
    }

    try {
      // Final check before submission
      const emailAvailable = await checkEmailAvailability(email);
      const usernameAvailable = await checkUsernameAvailability(username);

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

      if (!usernameAvailable.data.available) {
        setUsernameError("This username is already taken.");
        setGeneralError("Please fix the errors before submitting.");
        return;
      }

      // Proceed with signup
      const signupResponse = await signup({
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
          className="form-control"
          placeholder="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </div>
      <div className="form-group">
        <input
          type="text"
          className={`form-control ${usernameError ? "is-invalid" : ""}`}
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
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        {emailError && <div className="invalid-feedback">{emailError}</div>}
      </div>
      <div className="form-group">
        <input
          type="password"
          className="form-control"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </div>
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
