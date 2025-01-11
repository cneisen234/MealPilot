import React, { useState } from "react";
import { CantHave, MustHave } from "../../types";
import { FaPlus, FaTimes } from "react-icons/fa";

interface PreferenceInputProps {
  label: string;
  description: string;
  placeholder?: string;
  items?: Array<CantHave | MustHave>;
  onAdd?: (item: string) => Promise<void>;
  onRemove?: (id: number) => Promise<void>;
  commonOptions?: string[];
  type: "text" | "select" | "combo";
  options?: string[];
  selectedItem?: string;
  onSelect?: (item: string) => void;
  disabled: boolean;
}

const PreferenceInput: React.FC<PreferenceInputProps> = ({
  label,
  description,
  items,
  onAdd,
  onRemove,
  commonOptions = [],
  type = "text",
  options = [],
  selectedItem = "",
  onSelect,
  disabled,
}) => {
  const [item, setItem] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Get list of items already added for combo type
  const existingItems = items?.map((i) => i.item) || [];

  // Filter out common options that are already in the list for combo type
  const availableOptions = options.filter(
    (option) => !existingItems.includes(option)
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!item.trim() || isSubmitting || !onAdd) return;

    setIsSubmitting(true);
    try {
      await onAdd(item.trim().toLowerCase());
      setItem("");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setItem(e.target.value);
  };

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (type === "select") {
      onSelect?.(e.target.value);
    } else {
      const selectedItem = e.target.value;
      if (selectedItem && selectedItem !== "custom") {
        onAdd?.(selectedItem);
        e.target.value = "custom"; // Reset select to custom option
      }
    }
  };

  const renderContent = () => {
    switch (type) {
      case "select":
        return (
          <div className="select-group">
            <select
              value={selectedItem}
              onChange={handleSelectChange}
              className="preference-select">
              <option value="">Select a meal type...</option>
              {options.map((option) => (
                <option key={option} value={option}>
                  {option.charAt(0).toUpperCase() + option.slice(1)}
                </option>
              ))}
            </select>
          </div>
        );

      case "combo":
        return (
          <>
            <form onSubmit={handleSubmit}>
              <div className="input-group">
                <select
                  onChange={handleSelectChange}
                  className="preference-select"
                  disabled={isSubmitting || disabled}>
                  <option value="custom">Select a common item...</option>
                  {availableOptions.map((option) => (
                    <option
                      key={option}
                      value={option}
                      disabled={existingItems.includes(option)}>
                      {option.charAt(0).toUpperCase() + option.slice(1)}
                      {existingItems.includes(option) ? " (Already Added)" : ""}
                    </option>
                  ))}
                </select>
                <div className="input-with-button">
                  <input
                    type="text"
                    value={item}
                    onChange={handleInputChange}
                    placeholder="Or type your own..."
                    className="preference-input"
                    style={{ width: "80%" }}
                    disabled={isSubmitting || disabled}
                  />
                  {!disabled && (
                    <button
                      type="submit"
                      disabled={isSubmitting || disabled}
                      style={{ width: "20%" }}
                      className="add-button">
                      Add
                    </button>
                  )}
                </div>
              </div>
            </form>
            <br />

            <div className="items-container">
              {items?.map((i) => (
                <div key={i.id} className="preference-item">
                  <span>{i.item}</span>
                  <button
                    onClick={() => onRemove?.(i.id)}
                    className="remove-button"
                    aria-label="Remove item">
                    <FaTimes size={14} />
                  </button>
                </div>
              ))}
            </div>
          </>
        );

      default:
        return null;
    }
  };

  return (
    <div className="preference-section">
      <h3>{label}</h3>
      <p>{description}</p>
      {renderContent()}
    </div>
  );
};

export default PreferenceInput;
