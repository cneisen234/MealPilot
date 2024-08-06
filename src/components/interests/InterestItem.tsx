// src/components/interests/InterestItem.tsx
import React from "react";
import { Interest } from "../../types";

interface InterestItemProps {
  interest: Interest;
}

const InterestItem: React.FC<InterestItemProps> = ({ interest }) => {
  return (
    <div
      style={{
        border: "1px solid #ddd",
        padding: "15px",
        borderRadius: "8px",
        marginBottom: "15px",
      }}>
      <h3 style={{ color: "var(--primary-color)", marginBottom: "10px" }}>
        {interest.category}
      </h3>
      {interest.items.map((item, index) => (
        <div
          key={index}
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "5px 0",
            borderBottom:
              index < interest.items.length - 1 ? "1px solid #eee" : "none",
          }}>
          <span>{item.name}</span>
          <span
            style={{
              backgroundColor: "var(--primary-color)",
              color: "white",
              borderRadius: "50%",
              width: "25px",
              height: "25px",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              fontSize: "0.8em",
            }}>
            {item.rating}
          </span>
        </div>
      ))}
    </div>
  );
};

export default InterestItem;
