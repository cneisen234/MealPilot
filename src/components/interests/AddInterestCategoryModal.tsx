// src/components/interests/AddInterestCategoryModal.tsx

import userEvent from "@testing-library/user-event";
import React, { useState } from "react";
import { PrivacySetting, Interest, User } from "../../types";

interface AddInterestCategoryModalProps {
  onClose: () => void;
  onAddCategory: (newInterest: Omit<Interest, "id">) => Promise<void>;
  user: User;
}

const AddInterestCategoryModal: React.FC<AddInterestCategoryModalProps> = ({
  onClose,
  onAddCategory,
  user,
}) => {
  const [category, setCategory] = useState("");
  const [visibility, setVisibility] = useState<PrivacySetting>(
    PrivacySetting.Public
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (category.trim()) {
      const newInterest: Omit<Interest, "id"> = {
        category: category.trim(),
        visibility,
        items: [],
        userId: user.id,
      };
      await onAddCategory(newInterest);
      onClose();
    }
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "10px",
    borderRadius: "5px",
    border: "1px solid var(--primary-color)",
    fontSize: "16px",
    boxSizing: "border-box",
  };

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 1000,
      }}>
      <div
        style={{
          background: "var(--surface-color)",
          borderRadius: "15px",
          padding: "30px",
          width: "90%",
          maxWidth: "400px",
        }}>
        <h2 style={{ marginBottom: "20px", color: "var(--primary-color)" }}>
          Add New Interest Category
        </h2>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: "15px" }}>
            <label
              htmlFor="category"
              style={{ display: "block", marginBottom: "5px" }}>
              Category Name
            </label>
            <input
              type="text"
              id="category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              style={inputStyle}
              required
            />
          </div>
          <div style={{ marginBottom: "20px" }}>
            <label
              htmlFor="visibility"
              style={{ display: "block", marginBottom: "5px" }}>
              Visibility
            </label>
            <select
              id="visibility"
              value={visibility}
              onChange={(e) => setVisibility(e.target.value as PrivacySetting)}
              style={inputStyle}>
              <option value={PrivacySetting.Public}>Public</option>
              <option value={PrivacySetting.FriendsOnly}>Friends Only</option>
              <option value={PrivacySetting.Private}>Private</option>
            </select>
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: "10px",
            }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: "10px 20px",
                borderRadius: "5px",
                border: "none",
                backgroundColor: "var(--surface-color)",
                color: "var(--text-color)",
                cursor: "pointer",
              }}>
              Cancel
            </button>
            <button
              type="submit"
              style={{
                padding: "10px 20px",
                borderRadius: "5px",
                border: "none",
                backgroundColor: "var(--primary-color)",
                color: "white",
                cursor: "pointer",
              }}>
              Add Category
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddInterestCategoryModal;
