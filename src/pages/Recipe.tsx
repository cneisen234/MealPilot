import React, { useState, useEffect } from "react";
import {
  CantHave,
  MustHave,
  TastePreference,
  DietaryGoal,
  CuisinePreference,
} from "../types";
import AnimatedTechIcon from "../components/common/AnimatedTechIcon";
import PreferenceInput from "../components/common/PreferenceInput";
import {
  getCantHaves,
  addCantHave,
  removeCantHave,
  getMustHaves,
  addMustHave,
  removeMustHave,
  getTastePreferences,
  addTastePreference,
  removeTastePreference,
  getDietaryGoals,
  addDietaryGoal,
  removeDietaryGoal,
  getCuisinePreferences,
  addCuisinePreference,
  removeCuisinePreference,
  generateRecipe,
  saveRecipe,
  addSelectedMealType,
  addSelectedServings,
  getSelectedMealType,
  getSelectedServings,
} from "../utils/api";
import { MEAL_TYPES } from "../constants/mealTypes";
import {
  COMMON_CANT_HAVES,
  COMMON_MUST_HAVES,
  COMMON_TASTE_PREFERENCES,
  COMMON_DIETARY_GOALS,
  COMMON_CUISINE_PREFERENCES,
} from "../constants/dietaryItems";
import "../styles/recipe.css";
import { useLocation, useNavigate } from "react-router-dom";
import { FaArrowLeft, FaUtensils } from "react-icons/fa";
import { useToast } from "../context/ToastContext";
import { useAuth } from "../context/AuthContext";

interface Recipe {
  mealType: any;
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
  const routeLocation = useLocation();
  const { showToast } = useToast();
  //@ts-ignore
  const { aiActionsRemaining, setAiActionsRemaining } = useAuth();
  const [cantHaves, setCantHaves] = useState<CantHave[]>([]);
  const [mustHaves, setMustHaves] = useState<MustHave[]>([]);
  const [tastePreferences, setTastePreferences] = useState<TastePreference[]>(
    []
  );
  const [dietaryGoals, setDietaryGoals] = useState<DietaryGoal[]>([]);
  const [cuisinePreferences, setCuisinePreferences] = useState<
    CuisinePreference[]
  >([]);
  const [preferencesCount, setPreferencesCount] = useState(0);
  const [selectedMealType, setSelectedMealType] =
    useState<string>("main course");
  const [isLoading, setIsLoading] = useState(true);
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedServings, setSelectedServings] = useState<string>("4");
  const [selectedMealTypes, setSelectedMealTypes] = useState<any[]>([]);
  const [selectedServingsList, setSelectedServingsList] = useState<any[]>([]);
  const [isThinking, setIsThinking] = useState<boolean>(false);
  let currentStep = 1;

  useEffect(() => {
    loadPreferences();
  }, []);

  useEffect(() => {
    if (preferencesCount > 6) {
      showToast("Can't have more than 7 items selected", "warning");
    }
  }, [preferencesCount]);

  useEffect(() => {
    const cantHavesCount = cantHaves.length;
    const mustHavesCount = mustHaves.length;
    const tastePreferencesCount = tastePreferences.length;
    const dietaryGoalsCount = dietaryGoals.length;
    const cuisinePreferencesCount = cuisinePreferences.length;
    const totalPreferences =
      Number(cantHavesCount) +
      Number(mustHavesCount) +
      Number(tastePreferencesCount) +
      Number(dietaryGoalsCount) +
      Number(cuisinePreferencesCount);
    setPreferencesCount(totalPreferences);
  }, [
    cantHaves,
    mustHaves,
    tastePreferences,
    dietaryGoals,
    cuisinePreferences,
  ]);

  useEffect(() => {
    if (routeLocation.state?.recipe) {
      setRecipe(routeLocation.state.recipe);
    }
  }, [routeLocation.state]);

  const loadPreferences = async () => {
    try {
      const [
        cantHavesRes,
        mustHavesRes,
        tastePreferencesRes,
        dietaryGoalsRes,
        cuisinePreferencesRes,
        selectedMealTypeRes,
        selectedServingsRes,
      ] = await Promise.all([
        getCantHaves(),
        getMustHaves(),
        getTastePreferences(),
        getDietaryGoals(),
        getCuisinePreferences(),
        getSelectedMealType(),
        getSelectedServings(),
      ]);

      setCantHaves(cantHavesRes.data);
      setMustHaves(mustHavesRes.data);
      setTastePreferences(tastePreferencesRes.data);
      setDietaryGoals(dietaryGoalsRes.data);
      setCuisinePreferences(cuisinePreferencesRes.data);
      setSelectedMealTypes(selectedMealTypeRes.data);
      setSelectedServingsList(selectedServingsRes.data);

      // Set default selected values if they exist
      if (selectedMealTypeRes.data.length > 0) {
        setSelectedMealType(selectedMealTypeRes.data[0].item);
      }
      if (selectedServingsRes.data.length > 0) {
        setSelectedServings(selectedServingsRes.data[0].item);
      }
    } catch (error) {
      console.error("Error loading preferences:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleMealTypeChange = async (item: string) => {
    setSelectedMealType(item);
    try {
      await addSelectedMealType(item);
    } catch (error) {
      console.error("Error saving meal type:", error);
    }
  };

  const handleServingsChange = async (item: string) => {
    setSelectedServings(item);
    try {
      await addSelectedServings(item);
    } catch (error) {
      console.error("Error saving servings:", error);
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

  const handleAddTastePreference = async (item: string) => {
    try {
      await addTastePreference(item);
      const response = await getTastePreferences();
      setTastePreferences(response.data);
    } catch (error) {
      console.error("Error adding taste-preference:", error);
    }
  };

  const handleRemoveTastePreference = async (id: number) => {
    try {
      await removeTastePreference(id);
      const response = await getTastePreferences();
      setTastePreferences(response.data);
    } catch (error) {
      console.error("Error removing taste-preference:", error);
    }
  };

  const handleAddDietaryGoal = async (item: string) => {
    try {
      await addDietaryGoal(item);
      const response = await getDietaryGoals();
      setDietaryGoals(response.data);
    } catch (error) {
      console.error("Error adding dietary-goal:", error);
    }
  };

  const handleRemoveDietaryGoal = async (id: number) => {
    try {
      await removeDietaryGoal(id);
      const response = await getDietaryGoals();
      setDietaryGoals(response.data);
    } catch (error) {
      console.error("Error removing dietary-goal:", error);
    }
  };

  const handleAddCuisinePreference = async (item: string) => {
    try {
      await addCuisinePreference(item);
      const response = await getCuisinePreferences();
      setCuisinePreferences(response.data);
    } catch (error) {
      console.error("Error adding cuisine-preference:", error);
    }
  };

  const handleRemoveCuisinePreference = async (id: number) => {
    try {
      await removeCuisinePreference(id);
      const response = await getCuisinePreferences();
      setCuisinePreferences(response.data);
    } catch (error) {
      console.error("Error removing cuisine-preference:", error);
    }
  };

  const handleGenerateRecipe = async () => {
    setIsLoading(true);
    setTimeout(() => {
      setIsThinking(true);
    }, 5000);
    try {
      const response = await generateRecipe(selectedMealType, selectedServings);
      if (aiActionsRemaining === 10) {
        showToast(`You are running low on AI actions for today`, "warning");
      }
      if (aiActionsRemaining <= 0) {
        showToast(
          "You've reached your daily AI action limit. Try another method.",
          "error"
        );
        setIsThinking(false);
        setIsLoading(false);
        return;
      }
      setRecipe(response.data.recipe);
      const remainingActions = aiActionsRemaining - 1;
      setAiActionsRemaining(remainingActions);
    } catch (error) {
      showToast("Error generating recipe", "error");
      console.error("Error generating recipe:", error);
    } finally {
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
        //@ts-ignore
        mealType: recipe.mealType,
      });
      setRecipe(null);
      showToast("Recipe saved successfully!", "success");
      if (routeLocation.state?.fromMealPlan) {
        navigate("/mealplan", {
          state: {
            isNew: false,
            recipe,
          },
        });
      } else {
        navigate("/myrecipes");
      }
      // Could add success notification here
    } catch (error) {
      //@ts-ignore
      if (error.response?.data?.message?.includes("Recipe limit reached")) {
        showToast(
          "You've reached the limit of 50 recipes. Please delete some recipes to add new ones.",
          "error"
        );
      } else {
        showToast(
          //@ts-ignore
          error.response?.data?.message ||
            "Error saving recipe. Please try again.",
          "error"
        );
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleBack = () => {
    if (routeLocation.state?.fromMealPlan) {
      navigate("/mealplan");
    } else {
      setRecipe(null);
    }
  };

  if (isLoading) {
    return (
      <div className="loading-container">
        <AnimatedTechIcon size={100} speed={4} />
        {isThinking && <p>Thinking on it!</p>}
      </div>
    );
  }

  if (recipe) {
    return (
      <div style={{ marginBottom: 150, marginTop: 150 }}>
        <div
          style={{
            backgroundColor: "rgba(5, 71, 42, 0.1)",
            padding: "12px 20px",
            borderRadius: "8px",
            marginTop: "-20px",
            fontSize: "0.6rem",
            color: "var(--text-color)",
            maxWidth: "850px",
            margin: "20px auto",
          }}>
          DISCLAIMER: Recipes are AI generated and are intended to act as a
          starting point. It is always advised that you review any generated
          recipe for accuracy. To modify a recipe first save it and then you can
          edit it from your recipe list.
        </div>
        <div className="recipe-result">
          <div className="recipe-actions">
            <button
              onClick={handleBack}
              className="recipe-action-button back-button">
              <FaArrowLeft className="button-icon" />
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
              {recipe.ingredients?.map((ingredient, index) => (
                <li key={`ingredient-${index}`} className="recipe-list-item">
                  {ingredient}
                </li>
              ))}
            </ul>
          </div>

          <div className="recipe-section">
            <h2>Instructions</h2>
            <div className="recipe-list">
              {recipe.instructions?.map((instruction, index) => {
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
              {recipe.nutritionalInfo?.map((info, index) => (
                <li key={`nutrition-${index}`} className="recipe-list-item">
                  {info}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="recipe-container"
      style={{ marginBottom: 150, marginTop: 50 }}>
      <div className="recipe-header">
        <h1>Recipe Preferences</h1>
        <p>
          Choose up to 7 dietary preferences to get personalized recipe
          recommendations.
        </p>
        <div
          style={{
            backgroundColor: "rgba(5, 71, 42, 0.1)",
            padding: "12px 20px",
            borderRadius: "8px",
            marginTop: "-30px",
            fontSize: "0.6rem",
            color: "var(--text-color)",
            maxWidth: "800px",
            margin: "20px auto",
          }}>
          MEDICAL DISCLAIMER: MealSphere is not a substitute for professional
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
          onSelect={handleMealTypeChange}
          disabled={false}
        />
        <PreferenceInput
          label="Servings"
          description="How many servings do you want to make?"
          type="select"
          options={["1", "2", "3", "4", "5", "6", "7", "8"]}
          selectedItem={selectedServings}
          onSelect={handleServingsChange}
          disabled={false}
        />
        <PreferenceInput
          label="Can't-Haves"
          description="Select from common restrictions or add your own ingredients that you unable to eat."
          placeholder="Enter an ingredient you can't eat..."
          items={cantHaves}
          onAdd={handleAddCantHave}
          onRemove={handleRemoveCantHave}
          type="combo"
          options={COMMON_CANT_HAVES}
          disabled={preferencesCount > 6}
        />

        <PreferenceInput
          label="Must-Haves"
          description="Select from common ingredients or add your own that you want in your recipes."
          placeholder="Enter an ingredient you must have..."
          items={mustHaves}
          onAdd={handleAddMustHave}
          onRemove={handleRemoveMustHave}
          type="combo"
          options={COMMON_MUST_HAVES}
          disabled={preferencesCount > 6}
        />

        <PreferenceInput
          label="Taste"
          description="How do you want the item to taste?"
          placeholder="Enter a taste preference..."
          items={tastePreferences}
          onAdd={handleAddTastePreference}
          onRemove={handleRemoveTastePreference}
          type="combo"
          options={COMMON_TASTE_PREFERENCES}
          disabled={preferencesCount > 6}
        />

        <PreferenceInput
          label="Dietary Goals"
          description="Do you have any goals for your diet?"
          placeholder="Enter a goal..."
          items={dietaryGoals}
          onAdd={handleAddDietaryGoal}
          onRemove={handleRemoveDietaryGoal}
          type="combo"
          options={COMMON_DIETARY_GOALS}
          disabled={preferencesCount > 6}
        />

        <PreferenceInput
          label="Cuisine"
          description="Do you prefer a specific cuisine style?"
          placeholder="Enter a cuisine preference..."
          items={cuisinePreferences}
          onAdd={handleAddCuisinePreference}
          onRemove={handleRemoveCuisinePreference}
          type="combo"
          options={COMMON_CUISINE_PREFERENCES}
          disabled={preferencesCount > 6}
        />
      </div>

      <div className="generate-container">
        <button
          onClick={() => navigate("/myrecipes")}
          className="generate-button">
          <FaUtensils /> View My Recipes
        </button>
      </div>
    </div>
  );
};

export default Recipe;
