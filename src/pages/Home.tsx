// src/pages/Home.tsx
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";

interface Bubble {
  id: number;
  size: number;
  left: number;
  startDelay: number;
  duration: number;
  color: "primary" | "secondary";
}

const Home: React.FC = () => {
  const [bubbles, setBubbles] = useState<Bubble[]>([]);

  useEffect(() => {
    const generateBubbles = () => {
      const newBubbles: Bubble[] = [];
      for (let i = 0; i < 15; i++) {
        // Increased number of bubbles
        newBubbles.push({
          id: i,
          size: Math.random() * 80 + 20, // Adjusted size range
          left: Math.random() * 100,
          startDelay: Math.random() * 30,
          duration: Math.random() * 20 + 30, // Increased duration range
          color: Math.random() > 0.5 ? "primary" : "secondary",
        });
      }
      setBubbles(newBubbles);
    };

    generateBubbles();
  }, []);

  return (
    <div
      style={{
        backgroundColor: "var(--background-color)",
        minHeight: "100vh",
        position: "relative",
        overflow: "hidden",
      }}>
      {/* Animated Bubbles */}
      {bubbles.map((bubble) => (
        <div
          key={bubble.id}
          style={{
            position: "absolute",
            bottom: `-${bubble.size}px`, // Start below the screen
            left: `${bubble.left}%`,
            width: `${bubble.size}px`,
            height: `${bubble.size}px`,
            borderRadius: "50%",
            background: `var(--${bubble.color}-color)`,
            opacity: 0.1,
            animation: `rise ${bubble.duration}s linear infinite`,
            animationDelay: `${bubble.startDelay}s`,
          }}
        />
      ))}

      {/* Content */}
      <div className="center-container">
        <div className="content-wrapper">
          <div className="home-content">
            <h1
              style={{
                fontSize: "3.5rem",
                marginBottom: "1rem",
                color: "var(--primary-color)",
              }}>
              Take a quest into your vibe
            </h1>
            <p
              style={{
                fontSize: "1.5rem",
                marginBottom: "2rem",
                color: "var(--text-color)",
              }}>
              Let Lena AI spark new interests. Explore the unexpected. Grow your
              world.
            </p>
            <Link
              to="/signup"
              className="btn"
              style={{
                textDecoration: "none",
                fontSize: "1.2rem",
                padding: "15px 30px",
                marginBottom: "20px",
                display: "inline-block",
              }}>
              Start Your Quest
            </Link>
            <div className="auth-links">
              <Link to="/login" className="auth-link">
                Login
              </Link>
              <Link to="/signup" className="auth-link">
                Sign Up
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
