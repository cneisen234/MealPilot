// src/components/StarRating.tsx

import React, { useState } from "react";
import { FaStar } from "react-icons/fa";

interface StarRatingProps {
  rating: number;
  onRatingChange: (newRating: number) => void;
  editable?: boolean;
}

const StarRating: React.FC<StarRatingProps> = ({
  rating,
  onRatingChange,
  editable = true,
}) => {
  const [hover, setHover] = useState<number | null>(null);

  return (
    <div style={{ display: "inline-flex", alignItems: "center" }}>
      {[...Array(10)].map((_, index) => {
        const ratingValue = index + 1;
        return (
          <label
            key={index}
            style={{ cursor: editable ? "pointer" : "default" }}>
            <input
              type="radio"
              name="rating"
              value={ratingValue}
              onClick={() => editable && onRatingChange(ratingValue)}
              style={{ display: "none" }}
            />
            <FaStar
              color={(hover || rating) >= ratingValue ? "#ffc107" : "#e4e5e9"}
              size={editable ? 20 : 16}
              onMouseEnter={() => editable && setHover(ratingValue)}
              onMouseLeave={() => editable && setHover(null)}
            />
          </label>
        );
      })}
    </div>
  );
};

export default StarRating;
