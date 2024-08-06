import React, { useState } from "react";
import { Interest, Item, PrivacySetting } from "../../types";

interface AddInterestFormProps {
  onAddInterest: (interest: Omit<Interest, "id" | "userId">) => void;
}

const AddInterestForm: React.FC<AddInterestFormProps> = ({ onAddInterest }) => {
  const [category, setCategory] = useState("");
  const [itemName, setItemName] = useState("");
  const [itemRating, setItemRating] = useState<number>(5);
  const [visibility, setVisibility] = useState<PrivacySetting>(
    PrivacySetting.FriendsOnly
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newItem: Item = { name: itemName, rating: itemRating };
    const newInterest: Omit<Interest, "id" | "userId"> = {
      category,
      items: [newItem],
      visibility,
    };
    onAddInterest(newInterest);
    setCategory("");
    setItemName("");
    setItemRating(5);
    setVisibility(PrivacySetting.FriendsOnly);
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
      <div className="form-group">
        <select
          className="form-control"
          value={visibility}
          onChange={(e) => setVisibility(e.target.value as PrivacySetting)}
          required>
          <option value={PrivacySetting.Public}>Public</option>
          <option value={PrivacySetting.FriendsOnly}>Friends Only</option>
          <option value={PrivacySetting.Private}>Private</option>
        </select>
      </div>
      <button type="submit" className="btn btn-primary">
        Add Interest
      </button>
    </form>
  );
};

export default AddInterestForm;
