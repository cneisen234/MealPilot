import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import {
  getCurrentMealPlan,
  generateMealPlan,
  swapMealWithSaved,
  getUserRecipes,
} from "../utils/api";
import AnimatedTechIcon from "../components/common/AnimatedTechIcon";
import ConfirmationModal from "../components/common/ConfirmationModal";
import MealItem from "../components/MealPlan/MealItem";
import "../styles/mealplan.css";

interface Meal {
  title: string;
  isNew: boolean;
  recipeId: number | null;
}

interface DayPlan {
  breakfast: Meal;
  lunch: Meal;
  dinner: Meal;
}

interface MealPlan {
  id: number;
  created_at: string;
  expires_at: string;
  meals: {
    [key: string]: DayPlan;
  };
}

const MealPlan: React.FC = () => {
  const routeLocation = useLocation();
  const [mealPlan, setMealPlan] = useState<MealPlan | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [userRecipes, setUserRecipes] = useState([]);

  useEffect(() => {
    loadMealPlan();
    const loadUserRecipes = async () => {
      try {
        const response = await getUserRecipes();
        setUserRecipes(response.data);
      } catch (error) {
        console.error("Error loading recipes:", error);
      }
    };

    loadUserRecipes();
  }, []);

  useEffect(() => {
    if (routeLocation?.state?.isNew) {
    }
  }, [routeLocation?.state?.isNew]);

  const loadMealPlan = async () => {
    try {
      const response = await getCurrentMealPlan();
      if (response.data.exists) {
        setMealPlan(response.data.mealPlan);
      }
    } catch (error) {
      console.error("Error loading meal plan:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Reset hours to compare dates properly
    today.setHours(0, 0, 0, 0);
    tomorrow.setHours(0, 0, 0, 0);
    date.setHours(0, 0, 0, 0);

    if (date.getTime() === today.getTime()) {
      return "Today";
    } else if (date.getTime() === tomorrow.getTime()) {
      return "Tomorrow";
    } else {
      return new Intl.DateTimeFormat("en-US", {
        weekday: "long",
        month: "short",
        day: "numeric",
      }).format(date);
    }
  };

  const handleGeneratePlan = async () => {
    if (mealPlan) {
      setShowConfirmModal(true);
    } else {
      await generateNewPlan();
    }
  };

  const generateNewPlan = async () => {
    setIsLoading(true);
    try {
      const response = await generateMealPlan();
      setMealPlan(response.data.mealPlan);
    } catch (error) {
      console.error("Error generating meal plan:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const getFilteredMealPlan = () => {
    if (!mealPlan) return null;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return Object.entries(mealPlan.meals)
      .filter(([date]) => new Date(date) >= today)
      .sort(
        ([dateA], [dateB]) =>
          new Date(dateA).getTime() - new Date(dateB).getTime()
      );
  };

  const getDaysRemaining = () => {
    const filteredMealPlan = getFilteredMealPlan();
    if (!filteredMealPlan || filteredMealPlan.length === 0) return 0;
    return filteredMealPlan.length;
  };

  const handleMealSwap = async (
    date: string,
    mealType: string,
    newRecipeId: number
  ) => {
    try {
      const response = await swapMealWithSaved(date, mealType, newRecipeId);
      if (response.data.success) {
        // Update the meal plan state with the saved recipe
        setMealPlan((prevPlan) => {
          if (!prevPlan) return null;

          const updatedPlan = { ...prevPlan };
          const savedRecipe = response.data.recipe;

          updatedPlan.meals[date] = {
            ...updatedPlan.meals[date],
            [mealType]: {
              title: savedRecipe.title,
              isNew: false,
              recipeId: savedRecipe.id,
              // Include any other recipe properties that your app uses
              prepTime: savedRecipe.prepTime,
              cookTime: savedRecipe.cookTime,
              servings: savedRecipe.servings,
            },
          };

          return updatedPlan;
        });
      }
    } catch (error) {
      console.error("Error swapping meal:", error);
      // Handle error appropriately - maybe show a toast notification
    }
  };

  if (isLoading) {
    return (
      <div className="loading-container">
        <AnimatedTechIcon size={100} speed={4} />
        <p>This might take some time...</p>
      </div>
    );
  }

  const filteredMealPlan = getFilteredMealPlan();

  return (
    <div className="meal-plan-container">
      <div className="meal-plan-header">
        <div className="meal-plan-title">
          <h1>Weekly Meal Plan</h1>
        </div>
        {mealPlan && (
          <p className="days-remaining">{getDaysRemaining()} days remaining</p>
        )}
        <button onClick={handleGeneratePlan} className="regenerate-button">
          {mealPlan ? "Regenerate Plan" : "Generate New Plan"}
        </button>
      </div>

      <div
        style={{
          backgroundColor: "rgba(5, 71, 42, 0.1)",
          padding: "12px 20px",
          borderRadius: "8px",
          marginTop: "-20px",
          fontSize: "0.9rem",
          color: "var(--text-color)",
          maxWidth: "850px",
          margin: "20px auto",
        }}>
        DISCLAIMER: New recipes are AI generated and are intended to act as a
        starting point. It is always advised that you review any generated
        recipe for accuracy. To modify a recipe first save it and then you can
        edit it from your recipe list.
      </div>

      {mealPlan && filteredMealPlan && filteredMealPlan.length > 0 ? (
        <div className="meal-plan-grid">
          {filteredMealPlan.map(([date, meals]) => (
            <div key={date} className="day-card">
              <h2>{formatDate(date)}</h2>
              <div className="meals-list">
                <MealItem
                  mealType="Breakfast"
                  meal={meals.breakfast}
                  accentColor="#FF9D72"
                  date={date}
                  onMealSwap={handleMealSwap}
                  userRecipes={userRecipes}
                />
                <MealItem
                  mealType="Lunch"
                  meal={meals.lunch}
                  accentColor="#05472A"
                  date={date}
                  onMealSwap={handleMealSwap}
                  userRecipes={userRecipes}
                />
                <MealItem
                  mealType="Dinner"
                  meal={meals.dinner}
                  accentColor="#a1c800"
                  date={date}
                  onMealSwap={handleMealSwap}
                  userRecipes={userRecipes}
                />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <p>No meal plan generated yet.</p>
          <p>Generate a new plan to get started!</p>
        </div>
      )}

      {showConfirmModal && (
        <ConfirmationModal
          message="Generating a new meal plan will delete your current plan."
          additionalInfo="Are you sure you want to continue?"
          onClose={() => setShowConfirmModal(false)}
          onConfirm={async () => {
            setShowConfirmModal(false);
            await generateNewPlan();
          }}
        />
      )}
    </div>
  );
};

export default MealPlan;
