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
} from "../utils/api";
import { MEAL_TYPES } from "../constants/mealTypes";
import {
  COMMON_CANT_HAVES,
  COMMON_MUST_HAVES,
} from "../constants/dietaryItems";
import "../styles/recipe.css";

console.log(COMMON_CANT_HAVES);

const Recipe: React.FC = () => {
  const [cantHaves, setCantHaves] = useState<CantHave[]>([]);
  const [mustHaves, setMustHaves] = useState<MustHave[]>([]);
  const [selectedMealType, setSelectedMealType] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);

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
    setIsGenerating(true);
    try {
      await generateRecipe();
      // Handle response when backend is implemented
    } catch (error) {
      console.error("Error generating recipe:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="loading-container">
        <AnimatedTechIcon size={100} speed={4} />
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
        <button
          onClick={handleGenerateRecipe}
          disabled={isGenerating}
          className="generate-button">
          {isGenerating ? (
            <>
              <AnimatedTechIcon size={24} speed={4} />
              Generating Recipe...
            </>
          ) : (
            "Generate Recipe"
          )}
        </button>
      </div>
    </div>
  );
};

export default Recipe;
