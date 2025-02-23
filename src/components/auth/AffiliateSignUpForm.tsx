import React, { useState, useEffect, useCallback } from "react";
import {
  signupAffiliate,
  loginAffiliate,
  checkEmailAvailability,
} from "../../utils/api";
import { useAuth } from "../../context/AuthContext";
import useDebounce from "../../hooks/useDebounce";
import { emailFormatValidationHelper } from "../../helpers/emailFormatValidationHelper";
import {
  getPasswordValidationErrors,
  passwordValidationHelper,
} from "../../helpers/passwordValidationHelper";
import { InputWithPasswordToggle } from "./InputWithPasswordToggle";
import { useToast } from "../../context/ToastContext";

const AffiliateSignupForm: React.FC = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string[]>([]);
  const [emailError, setEmailError] = useState("");
  const [generalError, setGeneralError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const { showToast } = useToast();
  const { checkAffiliateAuthStatus, loginAffiliate: authLoginAffiliate } =
    useAuth();

  const debouncedEmail = useDebounce(email, 300);

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

    if (emailError || passwordError.length > 0) {
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

      // Proceed with affiliate signup
      await signupAffiliate({
        name,
        email: email.toLowerCase(),
        password,
      });

      // Login after signup
      const loginResponse = await loginAffiliate({ email, password });

      authLoginAffiliate(
        loginResponse.data.token,
        loginResponse.data.affiliate.name,
        loginResponse.data.affiliate.email,
        loginResponse.data.affiliate.affiliate_code
      );

      // Store the token
      localStorage.setItem("affiliateToken", loginResponse.data.token);

      // Update auth status
      checkAffiliateAuthStatus();
      showToast("Affiliate account created!", "success");
    } catch (error) {
      showToast("Error creating affiliate account", "error");
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
        <InputWithPasswordToggle
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            setPasswordError([]);
          }}
          showPassword={showPassword}
          onToggle={togglePasswordVisibility}
        />
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
        Create Affiliate Account
      </button>
    </form>
  );
};

export default AffiliateSignupForm;
