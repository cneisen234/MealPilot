import React from "react";
import { useNavigate } from "react-router-dom";
import "../../styles/mealplan.css";

interface Meal {
  title: string;
  cookTime: string;
  ingredients: string;
  instructions: string;
  mealType: string;
  nutritionalInfo: string;
  prepTime: string;
  servings: string;
  isNew: boolean;
  recipeId: number | null;
}

interface MealItemProps {
  mealType: string;
  meal: Meal;
  accentColor: string;
  date: string;
  userRecipes: Array<{ id: number; title: string }>;
  onMealSwap: (
    date: string,
    mealType: string,
    recipeId: number
  ) => Promise<void>;
}

const MealItem: React.FC<MealItemProps> = ({
  mealType,
  meal,
  accentColor,
  date,
  userRecipes,
  onMealSwap,
}) => {
  const navigate = useNavigate();

  console.log(meal);

  const handleRecipeClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest(".meal-swap-select")) {
      return;
    }

    if (meal?.recipeId) {
      navigate(`/myrecipes/${meal.recipeId}`, {
        state: { fromMealPlan: true },
      });
    } else {
      navigate("/recipe", {
        state: {
          recipe: {
            title: meal.title,
            cookTime: meal.cookTime,
            ingredients: meal.ingredients,
            instructions: meal.instructions,
            mealType: meal.mealType,
            nutritionalInfo: meal.nutritionalInfo,
            prepTime: meal.prepTime,
            servings: meal.servings,
          },
          fromMealPlan: true,
        },
      });
    }
  };

  const handleSwapChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const recipeId = parseInt(e.target.value);
    if (recipeId) {
      onMealSwap(date, mealType.toLowerCase(), recipeId);
    }
  };

  // Filter out current recipe from options
  const availableRecipes = userRecipes.filter(
    (recipe) => recipe.id !== meal?.recipeId
  );

  return (
    <div
      className="meal-item"
      onClick={handleRecipeClick}
      style={{ cursor: "pointer" }}>
      <div
        className="meal-header"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}>
        <h3 style={{ color: accentColor }}>{mealType}</h3>
        <select
          className="meal-swap-select"
          onChange={handleSwapChange}
          onClick={(e) => e.stopPropagation()}
          value=""
          style={{
            width: 160,
            padding: "4px 8px",
            borderRadius: "4px",
            border: "1px solid #ccc",
            backgroundColor: "white",
            cursor: "pointer",
          }}>
          <option value="">Swap recipe</option>
          {availableRecipes.map((recipe) => (
            <option key={recipe.id} value={recipe.id}>
              {recipe.title}
            </option>
          ))}
        </select>
      </div>
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
