import React from "react";
import { Interest } from "../../types";
import InterestItem from "./InterestItem";

interface InterestListProps {
  interests: Interest[];
}

const InterestList: React.FC<InterestListProps> = ({ interests }) => {
  return (
    <ul style={{ listStyleType: "none", padding: 0 }}>
      {interests.map((interest) => (
        <li key={interest.id} style={{ marginBottom: "10px" }}>
          <InterestItem interest={interest} />
        </li>
      ))}
    </ul>
  );
};

export default InterestList;
