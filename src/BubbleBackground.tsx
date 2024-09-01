// src/components/BubbleBackground.tsx
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
            borderRadius: "50%",
            background: `var(--${bubble.color}-color)`,
            opacity: 0.1,
            animation: `rise ${bubble.duration}s linear infinite`,
            animationDelay: `${bubble.startDelay}s`,
            zIndex: -10,
          }}
        />
      ))}
    </>
  );
};

export default BubbleBackground;
