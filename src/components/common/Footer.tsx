// src/components/common/Footer.tsx
import React from "react";
import { Link } from "react-router-dom";

const Footer: React.FC = () => {
  return (
    <footer
      style={{
        backgroundColor: "var(--surface-color)",
        color: "var(--text-color)",
        padding: "20px 0",
        boxShadow: "0 -2px 10px rgba(0, 0, 0, 0.1)",
      }}>
      <div
        style={{
          maxWidth: "1200px",
          margin: "0 auto",
          padding: "0 20px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}>
        <p>&copy; 2024 VibeQuest. Stay Awesome!</p>
        <div>
          <Link
            to="/terms"
            style={{
              color: "var(--text-color)",
              marginRight: "1rem",
              textDecoration: "none",
            }}>
            Terms
          </Link>
          <Link
            to="/privacy"
            style={{
              color: "var(--text-color)",
              textDecoration: "none",
            }}>
            Privacy
          </Link>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
