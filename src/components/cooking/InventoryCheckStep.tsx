import React, { useState } from "react";
import { deleteInventoryItemByName } from "../../utils/api";
import AnimatedTechIcon from "../common/AnimatedTechIcon";
import QtyInput from "../common/QtyInput";
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

  // New handler for QtyInput
  const handleQuantityChange = (name: string, newValue: number) => {
    setQuantities((prev) => ({
      ...prev,
      [name]: newValue,
    }));
  };

  const handleIngredientToggle = (name: string) => {
    if (selectedIngredients.includes(name)) {
      setSelectedIngredients((prev) =>
        prev.filter((itemName) => itemName !== name)
      );
    } else {
      setSelectedIngredients((prev) => [...prev, name]);
    }
  };

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
                      <QtyInput
                        value={quantities[name] || 0}
                        onChange={(value) => handleQuantityChange(name, value)}
                        min={0}
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
          {selectedIngredients.length === 0 ? (
            <div style={{ marginBottom: 20, fontSize: 18 }}>
              No ingredients were found.
            </div>
          ) : (
            <button
              onClick={handleRemoveFromInventory}
              disabled={selectedIngredients.length === 0 || isProcessing}
              className="primary-button"
              style={{ padding: 10, marginBottom: 15 }}>
              {isProcessing ? (
                <div className="processing-indicator">
                  <AnimatedTechIcon size={20} speed={4} />
                  <span>Processing...</span>
                </div>
              ) : (
                "Remove From Inventory"
              )}
            </button>
          )}
          <button
            onClick={onComplete}
            className="recipe-action-button back-button">
            Start Cooking!
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
