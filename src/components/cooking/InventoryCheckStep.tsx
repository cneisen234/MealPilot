import React, { useState } from "react";
import { deleteInventoryItemByName } from "../../utils/api";
import AnimatedTechIcon from "../common/AnimatedTechIcon";
import decimalHelper from "../../helpers/decimalHelper";
import InventoryUpdateConfirmModal from "../common/InventoryUpdateConfirm";

interface IngredientAnalysis {
  original: string;
  parsed?: {
    name: string;
    quantity: number;
  };
  status: {
    type: string;
    hasEnough: boolean;
    available?: {
      quantity: number;
      id: number;
    };
  };
}

interface UpdatedItem {
  name: string;
  removedQuantity: number;
  remainingQuantity?: number;
}

interface InventoryCheckStepProps {
  analyzedIngredients: IngredientAnalysis[];
  onComplete: () => void;
}

const InventoryCheckStep: React.FC<InventoryCheckStepProps> = ({
  analyzedIngredients,
  onComplete,
}) => {
  const [showConfirmation, setShowConfirmation] = useState(false);
  // Track which ingredients are selected for removal (default all to selected)
  const [selectedIngredients, setSelectedIngredients] = useState<string[]>(
    analyzedIngredients.map((ing) => ing.parsed?.name || "")
  );

  // Track custom quantities for each ingredient
  const [quantities, setQuantities] = useState<Record<string, number>>(
    analyzedIngredients.reduce((acc, ing) => {
      if (ing.parsed?.name && ing.parsed?.quantity) {
        acc[ing.parsed.name] = ing.parsed.quantity;
      }
      return acc;
    }, {} as Record<string, number>)
  );

  const [isProcessing, setIsProcessing] = useState(false);

  // Handle quantity input changes using existing decimal helper
  const handleQuantityChange = (
    name: string,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    decimalHelper((newValue: number) => {
      setQuantities((prev) => ({
        ...prev,
        [name]: newValue,
      }));
    }, e);
  };

  // Toggle ingredient selection
  const handleIngredientToggle = (name: string) => {
    if (selectedIngredients.includes(name)) {
      setSelectedIngredients((prev) =>
        prev.filter((itemName) => itemName !== name)
      );
    } else {
      setSelectedIngredients((prev) => [...prev, name]);
    }
  };

  // Process inventory updates for selected items
  const handleRemoveFromInventory = async () => {
    setIsProcessing(true);
    try {
      await Promise.all(
        selectedIngredients.map(async (name) => {
          const ingredient = analyzedIngredients.find(
            (ing) => ing.parsed?.name === name
          );
          if (ingredient?.parsed) {
            await deleteInventoryItemByName(
              name,
              quantities[name] || ingredient.parsed.quantity || 0
            );
          }
        })
      );
      setSelectedIngredients([]);
      setShowConfirmation(true);
      console.log(showConfirmation);
    } catch (error) {
      console.error("Error updating inventory:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleStartCooking = () => {
    setShowConfirmation(false);
    onComplete();
  };

  return (
    <div className="recipe-result">
      <div className="recipe-section">
        <h2 className="section-title">Let's prepare your ingredients</h2>

        <div className="inventory-list">
          {analyzedIngredients.map((ingredient) => {
            const name = ingredient.parsed?.name || "";
            return (
              <div key={name} className="inventory-item">
                <div className="item-content">
                  <span className="item-name">{name}</span>

                  <div className="item-right-content">
                    <div className="controls-group">
                      <input
                        type="text"
                        value={quantities[name] || ""}
                        onChange={(e) => handleQuantityChange(name, e)}
                        className="quantity-input"
                      />
                      <input
                        type="checkbox"
                        checked={selectedIngredients.includes(name)}
                        onChange={() => handleIngredientToggle(name)}
                        className="ingredient-checkbox"
                      />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="button-stack">
          <button
            onClick={handleRemoveFromInventory}
            disabled={selectedIngredients.length === 0 || isProcessing}
            className="primary-button">
            {isProcessing ? (
              <div className="processing-indicator">
                <AnimatedTechIcon size={20} speed={4} />
                <span>Processing...</span>
              </div>
            ) : (
              "Remove From Inventory"
            )}
          </button>
          <button onClick={onComplete} className="secondary-button">
            Start Cooking
          </button>
        </div>
      </div>
      <InventoryUpdateConfirmModal
        isOpen={showConfirmation}
        onStartCooking={handleStartCooking}
      />
    </div>
  );
};

export default InventoryCheckStep;
