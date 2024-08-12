import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { closeAccount } from "../../utils/api";
import { useAuth } from "../../context/AuthContext";

const CloseAccount: React.FC = () => {
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const { logout } = useAuth();

  const handleCloseAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      await closeAccount(password);
      logout();
      navigate("/");
    } catch (err) {
      setError(
        "Failed to close account. Please check your password and try again."
      );
    }
  };

  return (
    <div className="center-container">
      <div className="content-wrapper">
        <div className="auth-form">
          <h2>Close Your Account</h2>
          <p>
            We're sorry to see you go. Please note that this action is permanent
            and cannot be undone.
          </p>
          {!isConfirmOpen ? (
            <button
              onClick={() => setIsConfirmOpen(true)}
              className="btn btn-danger"
              style={{ width: "100%" }}>
              I want to close my account
            </button>
          ) : (
            <form onSubmit={handleCloseAccount}>
              <p>Please enter your password to confirm account closure:</p>
              <div className="form-group">
                <input
                  type="password"
                  className="form-control"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                />
              </div>
              {error && <p className="text-danger">{error}</p>}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginTop: "20px",
                }}>
                <button
                  type="button"
                  onClick={() => setIsConfirmOpen(false)}
                  className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-danger">
                  Permanently Close Account
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default CloseAccount;
