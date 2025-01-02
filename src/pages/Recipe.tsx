import React, { useState, useEffect } from "react";
import { CantHave, MustHave } from "../types";
import AnimatedTechIcon from "../components/common/AnimatedTechIcon";
import PreferenceInput from "../components/common/PreferenceInput";
import {
  getCantHaves,
  addCantHave,
  removeCantHave,
  getMustHaves,
  addMustHave,
  removeMustHave,
  generateRecipe,
  saveRecipe,
} from "../utils/api";
import { MEAL_TYPES } from "../constants/mealTypes";
import {
  COMMON_CANT_HAVES,
  COMMON_MUST_HAVES,
} from "../constants/dietaryItems";
import "../styles/recipe.css";
import { useNavigate } from "react-router-dom";

interface Recipe {
  title: string;
  prepTime: string;
  cookTime: string;
  servings: string;
  ingredients: string[];
  instructions: string[];
  nutritionalInfo: string[];
}

const Recipe = () => {
  const navigate = useNavigate();
  const [cantHaves, setCantHaves] = useState<CantHave[]>([]);
  const [mustHaves, setMustHaves] = useState<MustHave[]>([]);
  const [selectedMealType, setSelectedMealType] =
    useState<string>("main course");
  const [isLoading, setIsLoading] = useState(true);
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  let currentStep = 1;

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      const [cantHavesRes, mustHavesRes] = await Promise.all([
        getCantHaves(),
        getMustHaves(),
      ]);
      setCantHaves(cantHavesRes.data);
      setMustHaves(mustHavesRes.data);
    } catch (error) {
      console.error("Error loading preferences:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddCantHave = async (item: string) => {
    try {
      await addCantHave(item);
      const response = await getCantHaves();
      setCantHaves(response.data);
    } catch (error) {
      console.error("Error adding cant-have:", error);
    }
  };

  const handleRemoveCantHave = async (id: number) => {
    try {
      await removeCantHave(id);
      const response = await getCantHaves();
      setCantHaves(response.data);
    } catch (error) {
      console.error("Error removing cant-have:", error);
    }
  };

  const handleAddMustHave = async (item: string) => {
    try {
      await addMustHave(item);
      const response = await getMustHaves();
      setMustHaves(response.data);
    } catch (error) {
      console.error("Error adding must-have:", error);
    }
  };

  const handleRemoveMustHave = async (id: number) => {
    try {
      await removeMustHave(id);
      const response = await getMustHaves();
      setMustHaves(response.data);
    } catch (error) {
      console.error("Error removing must-have:", error);
    }
  };

  const handleGenerateRecipe = async () => {
    setIsLoading(true);
    try {
      const response = await generateRecipe(selectedMealType);
      setRecipe(response.data.recipe);
      setIsLoading(false);
    } catch (error) {
      console.error("Error generating recipe:", error);
      setIsLoading(false);
    }
  };

  const handleSaveRecipe = async () => {
    if (!recipe || isSaving) return;

    setIsSaving(true);
    try {
      await saveRecipe({
        title: recipe.title,
        prepTime: recipe.prepTime,
        cookTime: recipe.cookTime,
        servings: recipe.servings,
        ingredients: recipe.ingredients,
        instructions: recipe.instructions,
        nutritionalInfo: recipe.nutritionalInfo,
      });
      setRecipe(null);
      navigate("/myrecipes");
      // Could add success notification here
    } catch (error) {
      console.error("Error saving recipe:", error);
      // Could add error notification here
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="loading-container">
        <AnimatedTechIcon size={100} speed={4} />
      </div>
    );
  }

  if (recipe) {
    return (
      <div className="recipe-result">
        <div className="recipe-actions">
          <button
            onClick={() => setRecipe(null)}
            className="recipe-action-button back-button">
            Go Back
          </button>
          <button
            onClick={handleSaveRecipe}
            className="recipe-action-button save-button"
            disabled={isSaving}>
            {isSaving ? "Saving..." : "Save Recipe"}
          </button>
        </div>
        <h1 className="recipe-title">{recipe.title}</h1>

        <div className="recipe-meta">
          <div className="recipe-meta-item">
            <span className="meta-label">Prep Time:</span>
            <span className="meta-value">{recipe.prepTime}</span>
          </div>
          <div className="recipe-meta-item">
            <span className="meta-label">Cook Time:</span>
            <span className="meta-value">{recipe.cookTime}</span>
          </div>
          <div className="recipe-meta-item">
            <span className="meta-label">Servings:</span>
            <span className="meta-value">{recipe.servings}</span>
          </div>
        </div>

        <div className="recipe-section">
          <h2>Ingredients</h2>
          <ul className="recipe-list">
            {recipe.ingredients.map((ingredient, index) => (
              <li key={`ingredient-${index}`} className="recipe-list-item">
                {ingredient}
              </li>
            ))}
          </ul>
        </div>

        <div className="recipe-section">
          <h2>Instructions</h2>
          <div className="recipe-list">
            {recipe.instructions.map((instruction, index) => {
              // Check if the instruction is surrounded by double stars
              const isMainStep =
                instruction.startsWith("**") && instruction.endsWith("**");
              const content = isMainStep
                ? `${currentStep}. ${instruction.slice(2, -2)}` // Add number and remove stars
                : `- ${instruction}`;
              isMainStep && currentStep++;

              return (
                <React.Fragment key={`instruction-${index}`}>
                  {isMainStep && <br />}
                  <div
                    style={!isMainStep ? { marginLeft: "20px" } : {}}
                    className="recipe-list-item">
                    {content}
                  </div>
                </React.Fragment>
              );
            })}
          </div>
        </div>

        <div className="recipe-section">
          <h2>Nutritional Information</h2>
          <ul className="recipe-list nutrition-list">
            {recipe.nutritionalInfo.map((info, index) => (
              <li key={`nutrition-${index}`} className="recipe-list-item">
                {info}
              </li>
            ))}
          </ul>
        </div>
      </div>
    );
  }

  return (
    <div className="recipe-container">
      <div className="recipe-header">
        <h1>Recipe Preferences</h1>
        <p>
          Customize your dietary preferences to get personalized recipe
          recommendations.
        </p>
        <div
          style={{
            backgroundColor: "rgba(5, 71, 42, 0.1)",
            padding: "12px 20px",
            borderRadius: "8px",
            marginTop: "-20px",
            fontSize: "0.9rem",
            color: "var(--text-color)",
            maxWidth: "800px",
            margin: "20px auto",
          }}>
          MEDICAL DISCLAIMER: MealPilot is not a substitute for professional
          medical advice. Always consult your healthcare provider about your
          dietary needs and restrictions.
        </div>
      </div>

      <div className="preferences-grid">
        <PreferenceInput
          label="Meal Type"
          description="Select the type of meal you want to prepare."
          type="select"
          options={MEAL_TYPES}
          selectedItem={selectedMealType}
          onSelect={setSelectedMealType}
        />
        <PreferenceInput
          label="Can't Haves"
          description="Select from common restrictions or add your own ingredients that you cannot eat."
          placeholder="Enter an ingredient you can't eat..."
          items={cantHaves}
          onAdd={handleAddCantHave}
          onRemove={handleRemoveCantHave}
          type="combo"
          options={COMMON_CANT_HAVES}
        />

        <PreferenceInput
          label="Must Haves"
          description="Select from common ingredients or add your own that you want in your recipes."
          placeholder="Enter an ingredient you must have..."
          items={mustHaves}
          onAdd={handleAddMustHave}
          onRemove={handleRemoveMustHave}
          type="combo"
          options={COMMON_MUST_HAVES}
        />
      </div>

      <div className="generate-container">
        <button onClick={handleGenerateRecipe} className="generate-button">
          Generate Recipe
        </button>
      </div>
    </div>
  );
};

export default Recipe;
