import React, { useState, useEffect } from "react";
import decimalHelper from "../../helpers/decimalHelper";
import { FaTimes, FaTags, FaBoxOpen } from "react-icons/fa";
import { getUserRecipes } from "../../utils/api";
import "../../styles/shoppingList.css";

interface Recipe {
  id: number;
  title: string;
}

interface ShoppingListItem {
  id: number;
  item_name: string;
  quantity: number;
  unit: string;
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
    unit: string;
    recipe_ids: number[];
  }) => Promise<void>;
  onClose: () => void;
  onMoveToInventory?: (id: number, expiration_date: string) => Promise<void>;
}

const COMMON_UNITS = [
  "units",
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

const ShoppingListForm: React.FC<ShoppingListFormProps> = ({
  item,
  onSubmit,
  onClose,
  onMoveToInventory,
}) => {
  const [itemName, setItemName] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [unit, setUnit] = useState("pieces");
  const [recipeIds, setRecipeIds] = useState<number[]>([]);
  const [availableRecipes, setAvailableRecipes] = useState<Recipe[]>([]);
  const [showInventoryTransfer, setShowInventoryTransfer] = useState(false);
  const [expirationDate, setExpirationDate] = useState("");

  // Error states
  const [itemNameError, setItemNameError] = useState("");
  const [quantityError, setQuantityError] = useState("");
  const [expirationDateError, setExpirationDateError] = useState("");

  useEffect(() => {
    loadRecipes();
    if (item) {
      setItemName(item.item_name);
      setQuantity(item.quantity);
      setUnit(item.unit);
      setRecipeIds(item.tagged_recipes.map((recipe) => recipe.id));
    }
  }, [item]);

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

    if (quantity <= 0) {
      setQuantityError("Quantity must be greater than 0");
      isValid = false;
    } else {
      setQuantityError("");
    }

    if (showInventoryTransfer && !expirationDate) {
      setExpirationDateError("Expiration date is required for inventory items");
      isValid = false;
    } else {
      setExpirationDateError("");
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
          unit,
          recipe_ids: recipeIds,
        });
      }
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
                <label className="recipe-tag-label">
                  <FaTags /> Tag Recipes (Optional)
                </label>
                <div className="recipe-tag-list">
                  {availableRecipes.map((recipe) => (
                    <label key={recipe.id} className="recipe-tag-item">
                      <input
                        type="checkbox"
                        checked={recipeIds.includes(recipe.id)}
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
              {expirationDateError && (
                <span className="error-message">{expirationDateError}</span>
              )}
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
