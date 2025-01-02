import React, { useEffect, useState } from "react";

interface Bubble {
  id: number;
  size: number;
  left: number;
  startDelay: number;
  duration: number;
  color: "primary" | "secondary";
}

const BubbleBackground: React.FC = () => {
  const [bubbles, setBubbles] = useState<Bubble[]>([]);

  useEffect(() => {
    const generateBubbles = () => {
      const newBubbles: Bubble[] = [];
      for (let i = 0; i < 15; i++) {
        newBubbles.push({
          id: i,
          size: Math.random() * 80 + 20,
          left: Math.random() * 100,
          startDelay: Math.random() * 30,
          duration: Math.random() * 20 + 30,
          color: Math.random() > 0.5 ? "primary" : "secondary",
        });
      }
      setBubbles(newBubbles);
    };

    generateBubbles();
  }, []);

  return (
    <>
      {bubbles.map((bubble) => (
        <div
          key={bubble.id}
          style={{
            position: "absolute",
            bottom: `-${bubble.size}px`,
            left: `${bubble.left}%`,
            width: `${bubble.size}px`,
            height: `${bubble.size}px`,
            opacity: 0.1,
            animation: `rise ${bubble.duration}s linear infinite`,
            animationDelay: `${bubble.startDelay}s`,
            zIndex: -10,
          }}>
          {bubble.color === "primary" ? (
            <svg
              viewBox="0 0 100 100"
              style={{
                width: "100%",
                height: "100%",
                fill: "var(--primary-color)",
                transform: `rotate(${Math.random() * 360}deg)`,
              }}>
              <path
                d="M50 90 C50 90, 90 50, 90 25 C90 10, 75 5, 60 15 C45 25, 50 90, 50 90 
                       C50 90, 50 90, 50 90 C50 90, 55 25, 40 15 C25 5, 10 10, 10 25 C10 50, 50 90, 50 90 Z"
              />
            </svg>
          ) : (
            <div
              style={{
                width: "100%",
                height: "100%",
                borderRadius: "50%",
                background: "var(--secondary-color)",
              }}
            />
          )}
        </div>
      ))}
    </>
  );
};

export default BubbleBackground;
