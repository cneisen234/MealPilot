import React, { useState, useEffect } from "react";
import decimalHelper from "../../helpers/decimalHelper";
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

interface InventoryFormProps {
  item?: InventoryItem | null;
  onSubmit: (item: {
    item_name: string;
    quantity: number;
    unit: string;
    expiration_date: string;
  }) => Promise<void>;
  onClose: () => void;
}

const COMMON_UNITS = [
  "units",
  "grams",
  "kilograms",
  "gal",
  "quart",
  "milliliter",
  "liters",
  "cups",
  "tbsp",
  "tsp",
  "oz",
  "pounds",
];

const InventoryForm: React.FC<InventoryFormProps> = ({
  item,
  onSubmit,
  onClose,
}) => {
  const [itemName, setItemName] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [unit, setUnit] = useState("pieces");
  const [expirationDate, setExpirationDate] = useState("");

  const [itemNameError, setItemNameError] = useState("");
  const [quantityError] = useState("");
  const [expirationDateError] = useState("");

  useEffect(() => {
    if (item) {
      const expDate = new Date(item.expiration_date || "");
      const day = String(expDate.getDate()).padStart(2, "0");
      const month = String(expDate.getMonth() + 1).padStart(2, "0");
      const year = expDate.getFullYear();
      const formattedDate = `${year}-${month}-${day}`;

      setItemName(item.item_name);
      setQuantity(item.quantity);
      setUnit(item.unit);
      setExpirationDate(formattedDate);
    }
  }, [item]);

  const validateForm = () => {
    let isValid = true;

    if (!itemName.trim()) {
      setItemNameError("Item name is required");
      isValid = false;
    } else {
      setItemNameError("");
    }

    return isValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      await onSubmit({
        item_name: itemName,
        quantity,
        unit,
        expiration_date: expirationDate,
      });
      onClose();
    } catch (error) {
      console.error("Error submitting form:", error);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header-form">
          <h2>{item ? "Edit Item" : "Add New Item"}</h2>
          <button onClick={onClose} className="modal-close-btn">
            <FaTimes />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="inventory-form">
          <div className="form-group">
            <label htmlFor="item_name">Item Name</label>
            <input
              type="text"
              id="item_name"
              value={itemName}
              onChange={(e) => setItemName(e.target.value)}
              className={itemNameError ? "error" : ""}
              placeholder="Enter item name"
            />
            {itemNameError && (
              <span className="error-message">{itemNameError}</span>
            )}
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="quantity">Quantity</label>
              <input
                type="text"
                id="quantity"
                value={quantity}
                onChange={(e) => decimalHelper(setQuantity, e)}
                className={quantityError ? "error" : ""}
                min="0"
                step="1"
                placeholder="Enter quantity"
              />
              {quantityError && (
                <span className="error-message">{quantityError}</span>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="unit">Unit</label>
              <select
                id="unit"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}>
                {COMMON_UNITS.map((unitOption) => (
                  <option key={unitOption} value={unitOption}>
                    {unitOption}
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
              value={expirationDate}
              onChange={(e) => setExpirationDate(e.target.value)}
              className={expirationDateError ? "error" : ""}
            />
            {expirationDateError && (
              <span className="error-message">{expirationDateError}</span>
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
