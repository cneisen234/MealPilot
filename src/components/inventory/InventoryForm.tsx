import React, { useState, useEffect, Dispatch, SetStateAction } from "react";
import { FaTimes, FaShoppingBasket } from "react-icons/fa";
import QtyInput from "../common/QtyInput";

interface InventoryItem {
  id: number;
  item_name: string;
  quantity: number;
  created_at?: string;
  updated_at?: string;
  expiration_date?: string;
}

interface InventoryFormProps {
  item?: InventoryItem | null;
  initialItemName?: string | null;
  onSubmit: (item: {
    item_name: string;
    quantity: number;
    expiration_date: string;
  }) => Promise<void>;
  onClose: () => void;
  onMoveToShoppingList?: (id: number) => Promise<void>;
}

const InventoryForm: React.FC<InventoryFormProps> = ({
  item,
  initialItemName = "",
  onSubmit,
  onClose,
  onMoveToShoppingList,
}) => {
  const [itemName, setItemName] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [expirationDate, setExpirationDate] = useState("");
  const [itemNameError, setItemNameError] = useState("");
  const [quantityError] = useState("");
  const [expirationDateError] = useState("");
  const [showShoppingListTransfer, setShowShoppingListTransfer] =
    useState(false);

  useEffect(() => {
    if (item) {
      const expDate = new Date(item.expiration_date || "");
      const day = String(expDate.getDate()).padStart(2, "0");
      const month = String(expDate.getMonth() + 1).padStart(2, "0");
      const year = expDate.getFullYear();
      const formattedDate = `${year}-${month}-${day}`;

      setItemName(item.item_name);
      setQuantity(item.quantity);
      setExpirationDate(formattedDate);
    } else if (initialItemName) {
      setItemName(initialItemName);
    }
  }, [item, initialItemName]);

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
      if (showShoppingListTransfer && item && onMoveToShoppingList) {
        await onMoveToShoppingList(item.id);
      } else {
        await onSubmit({
          item_name: itemName,
          quantity,
          expiration_date: expirationDate,
        });
      }
      onClose();
    } catch (error) {
      console.error("Error submitting form:", error);
    }
  };

  const showNotThisItemButton = item && initialItemName;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header-form">
          <h2>{item ? "Edit Item" : "Add New Item"}</h2>
          <button
            onClick={() => {
              setItemName("");
              onClose();
            }}
            className="modal-close-btn">
            <FaTimes />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="inventory-form">
          {!showShoppingListTransfer ? (
            <>
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
              </div>

              <div className="form-row">
                <QtyInput
                  value={quantity}
                  onChange={setQuantity}
                  error={quantityError}
                  label="Quantity"
                />
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
                <button
                  onClick={() => setExpirationDate("")}
                  type="button"
                  className="submit-button">
                  Clear Exp Date
                </button>
              </div>
            </>
          ) : (
            <div className="confirmation-screen">
              <p>move {itemName} to your shopping list?</p>
              <p className="confirmation-details">
                Quantity to be moved: {quantity}
              </p>
            </div>
          )}

          {item && onMoveToShoppingList && !showShoppingListTransfer && (
            <button
              type="button"
              className="inventory-transfer-button"
              style={{ backgroundColor: "var(--secondary-color)" }}
              onClick={() => setShowShoppingListTransfer(true)}>
              <FaShoppingBasket /> Move to Shopping List
            </button>
          )}

          <div className="form-actions">
            {showShoppingListTransfer && (
              <button
                type="button"
                onClick={() => setShowShoppingListTransfer(false)}
                className="cancel-button">
                Back
              </button>
            )}
            <button type="submit" className="submit-button">
              {showShoppingListTransfer
                ? "Add to Shopping List"
                : item
                ? "Update Item"
                : "Add Item"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default InventoryForm;
