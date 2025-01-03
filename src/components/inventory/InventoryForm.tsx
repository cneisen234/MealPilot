import React, { useState, useEffect } from "react";
import { FaTimes } from "react-icons/fa";

interface InventoryItem {
  id: number;
  item_name: string;
  quantity: number;
  unit: string;
  created_at?: string;
  updated_at?: string;
  expiration_date?: string;
}

interface InventoryFormData {
  item_name: string;
  quantity: number;
  unit: string;
  expiration_date: string;
}

interface InventoryFormProps {
  item?: InventoryItem | null;
  onSubmit: (item: InventoryFormData) => Promise<void>;
  onClose: () => void;
}

const COMMON_UNITS = [
  "grams",
  "kg",
  "gal",
  "quart",
  "mililiter",
  "liter",
  "cups",
  "tbsp",
  "tsp",
  "oz",
  "lb",
];

const InventoryForm: React.FC<InventoryFormProps> = ({
  item,
  onSubmit,
  onClose,
}) => {
  const [formData, setFormData] = useState<InventoryFormData>({
    item_name: "",
    quantity: 1,
    unit: "pieces",
    expiration_date: "",
  });

  const [errors, setErrors] = useState({
    item_name: "",
    quantity: "",
    expiration_date: "",
  });

  useEffect(() => {
    const expDate = new Date(item?.expiration_date || "");
    const day = String(expDate.getDate()).padStart(2, "0");
    const month = String(expDate.getMonth() + 1).padStart(2, "0"); // January is 0
    const year = expDate.getFullYear();

    const formattedDate = `${year}-${month}-${day}`;

    console.log(formattedDate);
    if (item) {
      setFormData({
        item_name: item.item_name,
        quantity: item.quantity,
        unit: item.unit,
        expiration_date: formattedDate,
      });
    }
  }, [item]);

  const validateForm = () => {
    const newErrors = {
      item_name: "",
      quantity: "",
      expiration_date: "",
    };
    let isValid = true;

    if (!formData.item_name.trim()) {
      newErrors.item_name = "Item name is required";
      isValid = false;
    }

    if (formData.quantity <= 0) {
      newErrors.quantity = "Quantity must be greater than 0";
      isValid = false;
    }

    if (!formData.expiration_date) {
      newErrors.expiration_date = "Expiration date is required";
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      await onSubmit(formData);
      onClose();
    } catch (error) {
      console.error("Error submitting form:", error);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h2>{item ? "Edit Item" : "Add New Item"}</h2>
          <button onClick={onClose} className="close-button">
            <FaTimes />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="inventory-form">
          <div className="form-group">
            <label htmlFor="item_name">Item Name</label>
            <input
              type="text"
              id="item_name"
              value={formData.item_name}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, item_name: e.target.value }))
              }
              className={errors.item_name ? "error" : ""}
              placeholder="Enter item name"
            />
            {errors.item_name && (
              <span className="error-message">{errors.item_name}</span>
            )}
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="quantity">Quantity</label>
              <input
                type="text"
                id="quantity"
                value={formData.quantity}
                onChange={(e) =>
                  //@ts-ignore
                  setFormData((prev) => ({
                    ...prev,
                    quantity: e.target.value,
                  }))
                }
                className={errors.quantity ? "error" : ""}
                min="0"
                step="1"
                placeholder="Enter quantity"
              />
              {errors.quantity && (
                <span className="error-message">{errors.quantity}</span>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="unit">Unit</label>
              <select
                id="unit"
                value={formData.unit}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, unit: e.target.value }))
                }>
                {COMMON_UNITS.map((unit) => (
                  <option key={unit} value={unit}>
                    {unit}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="expiration_date">Expiration Date</label>
            <input
              type="date"
              id="expiration_date"
              value={formData.expiration_date}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  expiration_date: e.target.value,
                }))
              }
              className={errors.expiration_date ? "error" : ""}
            />
            {errors.expiration_date && (
              <span className="error-message">{errors.expiration_date}</span>
            )}
          </div>

          <div className="form-actions">
            <button type="button" onClick={onClose} className="cancel-button">
              Cancel
            </button>
            <button type="submit" className="submit-button">
              {item ? "Update Item" : "Add Item"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default InventoryForm;
