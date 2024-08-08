// src/pages/Interests.tsx
import React, { useState, useEffect } from "react";
import InterestList from "../components/interests/InterestList";
import { Interest, Item } from "../types";
import { getUserInterests, addInterest } from "../utils/api";

const Interests: React.FC = () => {
  const [interests, setInterests] = useState<Interest[]>([]);

  useEffect(() => {
    const fetchInterests = async () => {
      try {
        const response = await getUserInterests(1); // Assuming user ID 1 for now
        setInterests(response.data);
      } catch (error) {
        console.error("Error fetching interests:", error);
      }
    };

    fetchInterests();
  }, []);

  const handleAddInterest = async (newInterest: Omit<Interest, "id">) => {
    try {
      const response = await addInterest(newInterest);
      setInterests([...interests, response.data]);
    } catch (error) {
      console.error("Error adding interest:", error);
    }
  };

  return (
    <div>
      <h1>Your Interests</h1>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <div style={{ width: "48%" }}>
          <InterestList interests={interests} />
        </div>
      </div>
    </div>
  );
};

export default Interests;
