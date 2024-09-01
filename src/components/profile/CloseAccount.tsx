import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { closeAccount } from "../../utils/api";
import { useAuth } from "../../context/AuthContext";
import { FaArrowLeft } from "react-icons/fa";

const CloseAccount: React.FC = () => {
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const { logout } = useAuth();

  const handleCloseAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      await closeAccount();
      logout();
      navigate("/");
    } catch (err) {
      setError("Failed to close account. Please try again or contact support.");
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
            <>
              <button
                onClick={() => navigate("/profile")}
                className="btn"
                style={{
                  marginBottom: "5px",
                  alignItems: "center",
                  gap: "10px",
                  width: "100%",
                }}>
                Back to Profile
              </button>
              <button
                onClick={() => setIsConfirmOpen(true)}
                className="btn"
                style={{
                  width: "100%",
                  backgroundColor: "#dc3545",
                  color: "white",
                  marginTop: "20px",
                }}>
                I want to close my account
              </button>
            </>
          ) : (
            <form onSubmit={handleCloseAccount}>
              <p>
                Are you sure you want to close your account? This action cannot
                be undone.
              </p>
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
                <button
                  type="submit"
                  className="btn"
                  style={{ backgroundColor: "#dc3545", color: "white" }}>
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
