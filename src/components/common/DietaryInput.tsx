import React, { useState } from "react";
import { DietaryItem } from "../../types";
import { FaTimes } from "react-icons/fa";

interface DietaryInputProps {
  label: string;
  placeholder: string;
  description?: string;
  items: DietaryItem[];
  onAdd: (item: string) => Promise<void>;
  onRemove: (id: number) => Promise<void>;
}

const DietaryInput: React.FC<DietaryInputProps> = ({
  label,
  placeholder,
  description,
  items,
  onAdd,
  onRemove,
}) => {
  const [item, setItem] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (item.trim() && !isSubmitting) {
      setIsSubmitting(true);
      try {
        await onAdd(item.trim());
        setItem("");
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const handleRemove = async (id: number) => {
    try {
      await onRemove(id);
    } catch (error) {
      console.error("Error removing item:", error);
    }
  };

  return (
    <div className="mb-6 p-4 bg-white rounded-lg shadow-md">
      <h3 className="text-xl font-semibold mb-2 text-gray-800">{label}</h3>
      {description && (
        <p className="text-sm text-gray-600 mb-4">{description}</p>
      )}

      <form onSubmit={handleSubmit} className="mb-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={item}
            onChange={(e) => setItem(e.target.value)}
            placeholder={placeholder}
            className="flex-1 p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            disabled={isSubmitting}
          />
          <button
            type="submit"
            disabled={isSubmitting}
            className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-opacity-90 transition-colors disabled:opacity-50">
            Add
          </button>
        </div>
      </form>

      <div className="flex flex-wrap gap-2">
        {items.map((i) => (
          <div
            key={i.id}
            className="flex items-center gap-2 bg-gray-100 px-3 py-1 rounded-full">
            <span className="text-sm">{i.item}</span>
            <button
              onClick={() => handleRemove(i.id)}
              className="text-gray-500 hover:text-red-500 transition-colors">
              <FaTimes size={12} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DietaryInput;
