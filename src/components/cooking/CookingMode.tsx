import React, { useState, useEffect } from "react";
import { getRecipeInventory } from "../../utils/api";
import AnimatedTechIcon from "../common/AnimatedTechIcon";
import InstructionStep from "./InstructionStep";
import CookingComplete from "./CookingComplete";
import InventoryCheckStep from "./InventoryCheckStep";
import { useToast } from "../../context/ToastContext";
import { scaleIngredients } from "../../helpers/convertFractionToDecimal";

interface CookingModeProps {
  recipe: {
    id: number;
    title: string;
    instructions: string[];
    servings: string; // Original servings
  };
  displayServings: number; // Selected servings
  onClose: () => void;
}

const CookingMode: React.FC<CookingModeProps> = ({
  recipe,
  displayServings,
  onClose,
}) => {
  const { showToast } = useToast();
  const [currentStep, setCurrentStep] = useState(-1);
  const [state, setState] = useState({
    ingredients: [],
    isLoading: true,
  });

  useEffect(() => {
    const controller = new AbortController();

    const analyzeRecipeIngredients = async () => {
      try {
        const response = await getRecipeInventory(String(recipe.id));
        if (controller.signal.aborted) return;

        const inStockIngredients = response.data.ingredients.filter(
          (ing: any) => ing.status.type === "in-inventory"
        );

        // Scale ingredients based on servings
        const originalServings = parseInt(recipe.servings);
        const scaledIngredients = inStockIngredients.map((ing: any) => ({
          ...ing,
          original: scaleIngredients(
            ing.original,
            originalServings,
            displayServings
          ),
        }));

        const scaleFactor = Number(displayServings) / Number(recipe.servings);
        const ingredientsWithScaledQuantities = scaledIngredients.map(
          (i: any) => ({
            ...i,
            parsed: {
              ...i.parsed,
              quantity: i.parsed.quantity * Number(scaleFactor),
            },
          })
        );

        setState({
          ingredients: ingredientsWithScaledQuantities,
          isLoading: false,
        });

        showToast("Ingredients checked successfully", "success");
      } catch (error) {
        if (!controller.signal.aborted) {
          setState((prev) => ({ ...prev, isLoading: false }));
          showToast("Error checking ingredients", "error");
        }
      }
    };

    analyzeRecipeIngredients();

    return () => {
      controller.abort();
    };
  }, [recipe.id, displayServings, recipe.servings, showToast]);

  const handleExitClick = () => {
    onClose();
  };

  const renderContent = () => {
    if (currentStep === -1) {
      if (state.isLoading) {
        return (
          <div className="loading-container">
            <AnimatedTechIcon size={100} speed={4} />
            <p>Analyzing your inventory...</p>
          </div>
        );
      }

      return (
        <InventoryCheckStep
          analyzedIngredients={state.ingredients}
          onComplete={() => setCurrentStep(0)}
        />
      );
    }

    if (currentStep >= recipe.instructions.length) {
      return <CookingComplete recipeName={recipe.title} onFinish={onClose} />;
    }

    return (
      <InstructionStep
        instruction={recipe.instructions[currentStep]}
        stepNumber={currentStep + 1}
        totalSteps={recipe.instructions.length}
        onNext={() => setCurrentStep((prev) => prev + 1)}
        onPrevious={() => setCurrentStep((prev) => prev - 1)}
      />
    );
  };

  return (
    <div className="cooking-mode-container">
      <button
        style={{ margin: 10, right: 0, position: "absolute" }}
        onClick={handleExitClick}
        className="recipe-action-button back-button">
        Exit
      </button>
      <div className="cooking-mode-header">
        <h1 className="cooking-mode-title" style={{ textAlign: "center" }}>
          {recipe.title}
        </h1>
      </div>

      <div className="cooking-mode-content">{renderContent()}</div>
    </div>
  );
};

export default CookingMode;
