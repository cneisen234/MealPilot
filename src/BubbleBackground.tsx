import React, { useEffect, useState } from "react";
import {
  FaUtensils,
  FaHeart,
  FaLeaf,
  FaAppleAlt,
  FaCarrot,
  FaWineGlassAlt,
} from "react-icons/fa";

interface FloatingElement {
  id: number;
  size: number;
  left: number;
  startDelay: number;
  duration: number;
  rotation: number;
  type: "leaf" | "heart" | "utensil" | "apple" | "carrot" | "wine";
  color: "primary" | "secondary";
}

const BubbleBackground: React.FC = () => {
  const [elements, setElements] = useState<FloatingElement[]>([]);

  useEffect(() => {
    const generateElements = () => {
      const newElements: FloatingElement[] = [];
      const types: FloatingElement["type"][] = [
        "leaf",
        "heart",
        "utensil",
        "apple",
        "carrot",
        "wine",
      ];

      for (let i = 0; i < 20; i++) {
        newElements.push({
          id: i,
          size: Math.random() * 40 + 20,
          left: Math.random() * 100,
          startDelay: Math.random() * 20,
          duration: Math.random() * 15 + 25,
          rotation: Math.random() * 360,
          type: types[Math.floor(Math.random() * types.length)],
          color: Math.random() > 0.5 ? "primary" : "secondary",
        });
      }
      setElements(newElements);
    };

    generateElements();
  }, []);

  const renderIcon = (type: FloatingElement["type"], size: number) => {
    switch (type) {
      case "leaf":
        return <FaLeaf size={size} />;
      case "heart":
        return <FaHeart size={size} />;
      case "utensil":
        return <FaUtensils size={size} />;
      case "apple":
        return <FaAppleAlt size={size} />;
      case "carrot":
        return <FaCarrot size={size} />;
      case "wine":
        return <FaWineGlassAlt size={size} />;
      default:
        return null;
    }
  };

  return (
    <>
      {elements.map((element) => (
        <div
          key={element.id}
          className="mealpilot-float"
          style={{
            position: "absolute",
            bottom: `-${element.size}px`,
            left: `${element.left}%`,
            color: `var(--${element.color}-color)`,
            opacity: 0.1,
            transform: `rotate(${element.rotation}deg)`,
            animation: `mealpilot-float ${element.duration}s linear infinite`,
            animationDelay: `${element.startDelay}s`,
            zIndex: -10,
          }}>
          {renderIcon(element.type, element.size)}
        </div>
      ))}
    </>
  );
};

export default BubbleBackground;
