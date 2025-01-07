import React, { useState, useEffect } from "react";
import { getRecipeInventory } from "../../utils/api";
import AnimatedTechIcon from "../common/AnimatedTechIcon";
import InstructionStep from "./InstructionStep";
import CookingComplete from "./CookingComplete";
import InventoryCheckStep from "./InventoryCheckStep";

interface CookingModeProps {
  recipe: {
    id: number;
    title: string;
    instructions: string[];
  };
  onClose: () => void;
}

const CookingMode: React.FC<CookingModeProps> = ({ recipe, onClose }) => {
  const [currentStep, setCurrentStep] = useState(-1);
  const [analyzedIngredients, setAnalyzedIngredients] = useState<any[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(true);

  useEffect(() => {
    analyzeRecipeIngredients();
  }, [recipe.id]);

  const analyzeRecipeIngredients = async () => {
    try {
      //@ts-ignore
      const response = await getRecipeInventory(recipe.id);
      const inStockIngredients = response.data.ingredients.filter(
        (ing: any) => ing.status.type === "in-inventory"
      );
      setAnalyzedIngredients(inStockIngredients);
    } catch (error) {
      console.error("Error analyzing ingredients:", error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleExitClick = () => {
    onClose();
  };

  const renderContent = () => {
    if (currentStep === -1) {
      if (isAnalyzing) {
        return (
          <div className="loading-container">
            <AnimatedTechIcon size={100} speed={4} />
            <p>Analyzing your inventory...</p>
          </div>
        );
      }

      return (
        <InventoryCheckStep
          analyzedIngredients={analyzedIngredients}
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
