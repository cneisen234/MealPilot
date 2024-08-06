// src/components/interests/AddInterestForm.tsx
import React, { useState } from "react";
import { Interest, Item } from "../../types";

interface AddInterestFormProps {
  onAddInterest: (interest: Omit<Interest, "id">) => void;
}

const AddInterestForm: React.FC<AddInterestFormProps> = ({ onAddInterest }) => {
  const [category, setCategory] = useState("");
  const [itemName, setItemName] = useState("");
  const [itemRating, setItemRating] = useState<number>(5);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newItem: Item = { name: itemName, rating: itemRating };
    const newInterest: Omit<Interest, "id"> = {
      userId: 1, // Assuming user ID 1 for now
      category,
      items: [newItem],
    };
    onAddInterest(newInterest);
    setCategory("");
    setItemName("");
    setItemRating(5);
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="form-group">
        <input
          type="text"
          className="form-control"
          placeholder="Category"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          required
        />
      </div>
      <div className="form-group">
        <input
          type="text"
          className="form-control"
          placeholder="Item Name"
          value={itemName}
          onChange={(e) => setItemName(e.target.value)}
          required
        />
      </div>
      <div className="form-group">
        <input
          type="number"
          className="form-control"
          placeholder="Rating"
          value={itemRating}
          onChange={(e) => setItemRating(Number(e.target.value))}
          min="1"
          max="10"
          required
        />
      </div>
      <button type="submit" className="btn btn-primary">
        Add Interest
      </button>
    </form>
  );
};

export default AddInterestForm;
