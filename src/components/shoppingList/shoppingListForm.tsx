import React, { useState, useEffect } from "react";
import decimalHelper from "../../helpers/decimalHelper";
import { FaTimes, FaTags, FaBoxOpen } from "react-icons/fa";
import { getUserRecipes } from "../../utils/api";
import "../../styles/shoppingList.css";
import QtyInput from "../common/QtyInput";

interface Recipe {
  id: number;
  title: string;
}

interface ShoppingListItem {
  id: number;
  item_name: string;
  quantity: number;
  tagged_recipes: Array<{
    id: number;
    title: string;
  }>;
}

interface ShoppingListFormProps {
  item?: ShoppingListItem | null;
  onSubmit: (item: {
    item_name: string;
    quantity: number;
    recipe_ids: number[];
  }) => Promise<void>;
  onClose: () => void;
  onMoveToInventory?: (id: number, expiration_date: string) => Promise<void>;
  newItemFromPhoto?: string | null;
}

const ShoppingListForm: React.FC<ShoppingListFormProps> = ({
  item,
  onSubmit,
  onClose,
  onMoveToInventory,
  newItemFromPhoto,
}) => {
  const [itemName, setItemName] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [recipeIds, setRecipeIds] = useState<number[]>([]);
  const [availableRecipes, setAvailableRecipes] = useState<Recipe[]>([]);
  const [showInventoryTransfer, setShowInventoryTransfer] = useState(false);
  const [expirationDate, setExpirationDate] = useState("");

  // Error states
  const [itemNameError, setItemNameError] = useState("");
  const [quantityError] = useState("");
  const [expirationDateError] = useState("");

  useEffect(() => {
    loadRecipes();
    if (item) {
      setItemName(item.item_name);
      setQuantity(item.quantity);
      setRecipeIds(item?.tagged_recipes?.map((recipe) => recipe.id));
    } else if (newItemFromPhoto) {
      setItemName(newItemFromPhoto);
    }
  }, [item, newItemFromPhoto]);

  const loadRecipes = async () => {
    try {
      const response = await getUserRecipes();
      setAvailableRecipes(response.data);
    } catch (error) {
      console.error("Error loading recipes:", error);
    }
  };

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
      if (showInventoryTransfer && item && onMoveToInventory) {
        await onMoveToInventory(item.id, expirationDate);
      } else {
        await onSubmit({
          item_name: itemName,
          quantity,
          recipe_ids: recipeIds,
        });
      }
      setItemName("");
      setQuantity(1);
      setRecipeIds([]);
      onClose();
    } catch (error) {
      console.error("Error submitting form:", error);
    }
  };

  const handleRecipeToggle = (recipeId: number) => {
    setRecipeIds((prev) =>
      prev.includes(recipeId)
        ? prev.filter((id) => id !== recipeId)
        : [...prev, recipeId]
    );
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
          {!showInventoryTransfer && (
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
                />
              </div>

              <div className="form-group">
                <label className="recipe-tag-label">
                  <FaTags /> Tag Recipes (Optional)
                </label>
                <div className="recipe-tag-list">
                  {availableRecipes.map((recipe) => (
                    <label key={recipe.id} className="recipe-tag-item">
                      <input
                        type="checkbox"
                        checked={recipeIds?.includes(recipe.id)}
                        onChange={() => handleRecipeToggle(recipe.id)}
                      />
                      <span>{recipe.title}</span>
                    </label>
                  ))}
                </div>
              </div>
            </>
          )}

          {item && onMoveToInventory && !showInventoryTransfer && (
            <button
              type="button"
              className="inventory-transfer-button"
              style={{ backgroundColor: "var(--secondary-color)" }}
              onClick={() => setShowInventoryTransfer(true)}>
              <FaBoxOpen /> Move to Inventory
            </button>
          )}

          {showInventoryTransfer && (
            <div className="form-group">
              <label htmlFor="expiration_date">Expiration Date</label>
              <input
                type="date"
                id="expiration_date"
                value={expirationDate}
                onChange={(e) => setExpirationDate(e.target.value)}
                className={expirationDateError ? "error" : ""}
              />
            </div>
          )}

          <div className="form-actions">
            <button
              type="button"
              onClick={() => {
                if (showInventoryTransfer) {
                  setShowInventoryTransfer(false);
                } else {
                  onClose();
                  setItemName("");
                  setQuantity(1);
                  setRecipeIds([]);
                }
              }}
              className="cancel-button">
              {showInventoryTransfer ? "Back" : "Cancel"}
            </button>
            <button type="submit" className="submit-button">
              {showInventoryTransfer
                ? "Add to Inventory"
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

export default ShoppingListForm;
