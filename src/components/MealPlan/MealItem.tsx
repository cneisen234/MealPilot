import React from "react";
import { useNavigate } from "react-router-dom";
import "../../styles/mealplan.css";

interface Meal {
  title: string;
  isNew: boolean;
  recipeId: number | null;
  prepTime?: string;
  cookTime?: string;
  servings?: string;
  ingredients?: string[];
  instructions?: string[];
  nutritionalInfo?: string[];
}

interface MealItemProps {
  mealType: string;
  meal: Meal;
  accentColor: string;
}

const MealItem: React.FC<MealItemProps> = ({ mealType, meal, accentColor }) => {
  const navigate = useNavigate();

  const handleRecipeClick = () => {
    if (meal.recipeId) {
      // Navigate to saved recipe with source information
      navigate(`/myrecipes/${meal.recipeId}`, {
        state: {
          fromMealPlan: true,
        },
      });
    } else {
      // Navigate to recipe view with full recipe data
      navigate("/recipe", {
        state: {
          recipe: {
            title: meal.title,
            prepTime: meal.prepTime,
            cookTime: meal.cookTime,
            servings: meal.servings,
            ingredients: meal.ingredients,
            instructions: meal.instructions,
            nutritionalInfo: meal.nutritionalInfo,
          },
          fromMealPlan: true,
        },
      });
    }
  };

  return (
    <div
      className="meal-item"
      onClick={handleRecipeClick}
      style={{ cursor: "pointer" }}>
      <h3 style={{ color: accentColor }}>{mealType}</h3>
      <p>{meal.title}</p>
      {meal.isNew ? (
        <span className="new-recipe-badge">New Recipe</span>
      ) : (
        <span className="saved-recipe-badge">Saved Recipe</span>
      )}
    </div>
  );
};

export default MealItem;
