import React, { useState } from "react";
import QtyInput from "../common/QtyInput";
import AnimatedTechIcon from "../common/AnimatedTechIcon";
import { addMultipleToShoppingList } from "../../utils/api";
import { useToast } from "../../context/ToastContext";

interface IngredientAnalysis {
  original: string;
  parsed?: {
    quantity: number;
    name: string;
  };
  status: {
    type: "in-inventory" | "in-shopping-list" | "missing" | "unparseable";
    hasEnough?: boolean;
    available?: {
      quantity: number;
      id: number;
    };
  };
}

interface MultiAddToShoppingListProps {
  ingredients: IngredientAnalysis[];
  onClose: () => void;
}

const extractItemName = (original: string): string => {
  // First, convert everything to lowercase for consistent matching
  let processed = original.toLowerCase();

  // List of all measurement terms to remove
  const measurements = [
    "cup",
    "cups",
    "tablespoon",
    "tablespoons",
    "tbsp",
    "teaspoon",
    "teaspoons",
    "tsp",
    "pound",
    "pounds",
    "lb",
    "lbs",
    "ounce",
    "ounces",
    "oz",
    "gram",
    "grams",
    "g",
    "ml",
    "milliliter",
    "milliliters",
    "pinch",
    "pinches",
    "dash",
    "dashes",
    "handful",
    "handfuls",
    "piece",
    "pieces",
    "slice",
    "slices",
    "can",
    "cans",
    "package",
    "packages",
    "bottle",
    "bottles",
  ];

  processed = processed
    .replace(/[^a-zA-Z\s]/g, "") // Remove everything except alphabet and spaces
    .replace(/\s+/g, " "); // Normalize multiple spaces to a single space

  // Remove all measurement terms
  measurements.forEach((measure) => {
    // Create regex that matches the measure with optional 's' at end
    const measureRegex = new RegExp(`\\b${measure}s?\\b`, "g");
    processed = processed.replace(measureRegex, "");
  });

  // Remove common connectors and prepositions
  const connectors = [
    "of",
    "the",
    "a",
    "an",
    "fresh",
    "chopped",
    "diced",
    "sliced",
  ];
  connectors.forEach((connector) => {
    const connectorRegex = new RegExp(`\\b${connector}\\b`, "g");
    processed = processed.replace(connectorRegex, "");
  });

  // Clean up whitespace and commas
  processed = processed
    .replace(/,/g, "") // Remove commas
    .replace(/\s+/g, " ") // Collapse multiple spaces
    .trim(); // Remove leading/trailing whitespace

  // Capitalize first letter
  return processed.charAt(0).toUpperCase() + processed.slice(1);
};

const MultiAddToShoppingList: React.FC<MultiAddToShoppingListProps> = ({
  ingredients,
  onClose,
}) => {
  const { showToast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedItems, setSelectedItems] = useState<Set<number>>(
    new Set(ingredients.map((_, index) => index))
  );
  const [quantities, setQuantities] = useState<Record<number, number>>(
    Object.fromEntries(
      ingredients.map((ing, index) => [index, ing.parsed?.quantity || 1])
    )
  );
  const [itemNames, setItemNames] = useState<Record<number, string>>(
    Object.fromEntries(
      ingredients.map((ing, index) => [
        index,
        ing.status.type === "in-inventory"
          ? ing.parsed?.name || extractItemName(ing.original)
          : extractItemName(ing.original),
      ])
    )
  );

  const handleToggleItem = (index: number) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedItems(newSelected);
  };

  const handleNameChange = (index: number, value: string) => {
    setItemNames((prev) => ({
      ...prev,
      [index]: value,
    }));
  };

  const handleQuantityChange = (index: number, value: number) => {
    setQuantities((prev) => ({
      ...prev,
      [index]: value,
    }));
  };

  const handleSubmit = async () => {
    setIsProcessing(true);
    try {
      const itemsToAdd = Array.from(selectedItems).map((index) => ({
        item_name: itemNames[index],
        quantity: quantities[index],
      }));

      await addMultipleToShoppingList(itemsToAdd);
      showToast(`${itemsToAdd.length} items added to shopping list`, "success");
      onClose();
    } catch (error) {
      showToast("Error adding items to shopping list", "error");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="recipe-result">
      <div className="recipe-section">
        <div className="modal-header">
          <h2>Add to Shopping List</h2>
          <p>Select items to add to your shopping list</p>
        </div>

        <div className="matches-table">
          <div className="matches-header">
            <div className="matches-item">Manage items</div>
            <div className="matches-check"></div>
          </div>

          {ingredients.map((ingredient, index) => (
            <div key={index} style={{ width: "100%" }} className="matches-row">
              <div className="matches-item">
                <input
                  type="text"
                  value={itemNames[index]}
                  onChange={(e) => handleNameChange(index, e.target.value)}
                  className="array-input"
                  style={{ width: "80%" }}
                />

                <QtyInput
                  value={quantities[index]}
                  onChange={(value) => handleQuantityChange(index, value)}
                  min={0}
                />
                {ingredients[index].status.type === "in-inventory" && (
                  <button
                    onClick={() => {
                      // Update the item name to the parsed version
                      setItemNames((prev) => ({
                        ...prev,
                        [index]: extractItemName(ingredients[index].original),
                      }));
                      // Hide the button by marking this item as no longer matched
                      const updatedIngredient = { ...ingredients[index] };
                      updatedIngredient.status.type = "missing";
                      ingredients[index] = updatedIngredient;
                    }}
                    className="incorrect-match-button"
                    style={{
                      padding: "4px 8px",
                      backgroundColor: "var(--secondary-color)",
                      color: "white",
                      border: "none",
                      borderRadius: "4px",
                      cursor: "pointer",
                      fontSize: "0.8rem",
                    }}>
                    Incorrect Match
                  </button>
                )}
              </div>
              <div className="matches-item">
                <input
                  type="checkbox"
                  checked={selectedItems.has(index)}
                  onChange={() => handleToggleItem(index)}
                  className="ingredient-checkbox"
                />
              </div>
            </div>
          ))}
        </div>

        <div className="modal-footer">
          <button
            onClick={onClose}
            className="button-cancel"
            disabled={isProcessing}>
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="button-add"
            disabled={isProcessing || selectedItems.size === 0}>
            {isProcessing ? (
              <div className="button-content">
                <AnimatedTechIcon size={20} speed={4} />
                <span>Processing...</span>
              </div>
            ) : (
              `Add ${selectedItems.size} ${
                selectedItems.size === 1 ? "Item" : "Items"
              } to Shopping List`
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default MultiAddToShoppingList;
