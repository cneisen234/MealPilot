import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import "../../styles/header.css";

const Header: React.FC = () => {
  const { isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <header className="header">
      <div className="header-title">
        {" "}
        <img
          src="/MealPilot-icon-transparent.png"
          alt="MealPilot Logo"
          className="header-logo"
        />
        MealPilot
      </div>
      <nav className="header-nav">
        {isAuthenticated ? (
          <>
            <button onClick={handleLogout} className="logout-button">
              Logout
            </button>
          </>
        ) : (
          <>
            <Link to="/login" className="login-link">
              Login
            </Link>
            <Link to="/signup" className="btn signup-link">
              Sign up for Meal Pilot
            </Link>
          </>
        )}
      </nav>
    </header>
  );
};

export default Header;
