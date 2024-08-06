// src/components/common/Header.tsx
import React from "react";
import { Link } from "react-router-dom";

const Header: React.FC = () => {
  return (
    <header
      style={{
        backgroundColor: "var(--surface-color)",
        padding: "1rem",
        boxShadow: "0 2px 10px rgba(0, 0, 0, 0.1)",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
      }}>
      <div
        style={{
          fontSize: "24px",
          fontWeight: "bold",
          background:
            "linear-gradient(45deg, var(--primary-color), var(--secondary-color))",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          backgroundClip: "text",
          color: "transparent",
        }}>
        VibeQuest
      </div>
      <nav>
        <Link
          to="/login"
          style={{
            color: "var(--text-color)",
            marginRight: "1rem",
            textDecoration: "none",
            fontWeight: "600",
          }}>
          Login
        </Link>
        <Link
          to="/signup"
          className="btn"
          style={{
            textDecoration: "none",
          }}>
          Join the Quest
        </Link>
      </nav>
    </header>
  );
};

export default Header;
