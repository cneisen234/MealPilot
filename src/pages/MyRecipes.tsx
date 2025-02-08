import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  generateRandomRecipe,
  generateRecipe,
  getUserRecipes,
  incrementAchievement,
} from "../utils/api";
import { FaPlus, FaMagic } from "react-icons/fa";
import AnimatedTechIcon from "../components/common/AnimatedTechIcon";
import SearchInput from "../components/common/SearchInput";
import { useToast } from "../context/ToastContext";
import { useAuth } from "../context/AuthContext";
import "../styles/myrecipes.css";

interface Recipe {
  id: number;
  title: string;
  prep_time: string;
  cook_time: string;
  servings: string;
  ingredients: string[];
  instructions: string[];
  nutritional_info: string[];
  created_at: string;
}

const MyRecipes: React.FC = () => {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [filteredRecipes, setFilteredRecipes] = useState<Recipe[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const { showToast } = useToast();
  const { aiActionsRemaining, setAiActionsRemaining } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    loadRecipes();
  }, []);

  const loadRecipes = async () => {
    try {
      const response = await getUserRecipes();
      setRecipes(response.data);
      setFilteredRecipes(response.data);
    } catch (error) {
      console.error("Error loading recipes:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateRandomRecipe = async () => {
    setIsGenerating(true); // Use existing loading state
    try {
      if (aiActionsRemaining <= 0) {
        showToast("You've reached your daily AI action limit", "error");
        return;
      }

      const response = await generateRandomRecipe();
      const result = await incrementAchievement("recipes_generated");
      if (result.toast) {
        showToast(result.toast.message, "info");
      }
      if (response.data.recipe) {
        navigate("/recipe", { state: { recipe: response.data.recipe } });
        const remainingActions = aiActionsRemaining - 1;
        setAiActionsRemaining(remainingActions);
      }
    } catch (error) {
      showToast("Error generating recipe", "error");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateRecipe = async () => {
    setIsGenerating(true);
    try {
      if (aiActionsRemaining <= 0) {
        showToast("You've reached your daily AI action limit", "error");
        return;
      }
      const response = await generateRecipe();
      const result = await incrementAchievement("recipes_generated");
      if (result.toast) {
        showToast(result.toast.message, "info");
      }
      if (response.data.recipe) {
        navigate("/recipe", { state: { recipe: response.data.recipe } });
        const remainingActions = aiActionsRemaining - 1;
        setAiActionsRemaining(remainingActions);
      }
    } catch (error) {
      showToast("Error generating recipe", "error");
    } finally {
      setIsGenerating(false);
    }
  };

  if (isLoading || isGenerating) {
    return (
      <div className="loading-container">
        <AnimatedTechIcon size={100} speed={4} />{" "}
        {isGenerating && "thinking on it!"}
      </div>
    );
  }

  return (
    <div
      className="my-recipes-container"
      style={{ marginBottom: 150, marginTop: 50 }}>
      <div className="page-header">
        <h1>My Recipes</h1>
        <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
          <button
            onClick={() => navigate("/recipe/create")}
            className="generate-button">
            <FaPlus /> Create/Import New
          </button>
          <button
            onClick={handleGenerateRandomRecipe}
            className="generate-button">
            <FaMagic /> Generate Any
          </button>
          <button onClick={handleGenerateRecipe} className="generate-button">
            <FaMagic /> Generate By Preference
          </button>
        </div>
      </div>

      {recipes.length > 0 && (
        <SearchInput
          items={recipes.map((recipe) => ({
            ...recipe,
            name: recipe.title,
          }))}
          onSearch={(filtered) => setFilteredRecipes(filtered)}
          placeholder="Search your recipes..."
        />
      )}

      {recipes.length === 0 ? (
        <div className="empty-state">
          <p>You haven't saved any recipes yet.</p>
          <p>Generate your first recipe to get started!</p>
        </div>
      ) : (
        <div className="recipes-grid">
          {filteredRecipes.map((recipe) => (
            <div
              key={recipe.id}
              className="recipe-card"
              style={{ paddingBottom: 10 }}
              onClick={() => navigate(`/myrecipes/${recipe.id}`)}>
              <h2 className="recipe-card-title">{recipe.title}</h2>

              {/* <div className="recipe-card-meta">
                {recipe.prep_time && (
                  <div className="recipe-card-meta-item">
                    <span className="meta-label">Prep</span>
                    <span className="meta-value">{recipe.prep_time}</span>
                  </div>
                )}
                {recipe.cook_time && (
                  <div className="recipe-card-meta-item">
                    <span className="meta-label">Cook</span>
                    <span className="meta-value">{recipe.cook_time}</span>
                  </div>
                )}
                {recipe.servings && (
                  <div className="recipe-card-meta-item">
                    <span className="meta-label">Servings</span>
                    <span className="meta-value">{recipe.servings}</span>
                  </div>
                )}
              </div> */}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MyRecipes;
