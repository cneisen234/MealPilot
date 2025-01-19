import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getUserRecipes } from "../utils/api";
import AnimatedTechIcon from "../components/common/AnimatedTechIcon";
import SearchInput from "../components/common/SearchInput";
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

  if (isLoading) {
    return (
      <div className="loading-container">
        <AnimatedTechIcon size={100} speed={4} />
      </div>
    );
  }

  return (
    <div
      className="my-recipes-container"
      style={{ marginBottom: 150, marginTop: 50 }}>
      <div className="page-header">
        <h1>My Recipes</h1>
        <button
          onClick={() => navigate("/recipe/create")}
          className="generate-button">
          Create New Recipe
        </button>
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
              onClick={() => navigate(`/myrecipes/${recipe.id}`)}>
              <h2 className="recipe-card-title">{recipe.title}</h2>

              <div className="recipe-card-meta">
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
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MyRecipes;
