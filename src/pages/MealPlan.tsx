import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  getCurrentMealPlan,
  generateMealPlan,
  swapMealWithSaved,
  getUserRecipes,
  deleteMealPlan,
  incrementAchievement,
} from "../utils/api";
import AnimatedTechIcon from "../components/common/AnimatedTechIcon";
import ConfirmationModal from "../components/common/ConfirmationModal";
import MealItem from "../components/MealPlan/MealItem";
import { useToast } from "../context/ToastContext";

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
  const { showToast } = useToast();
  const [mealPlan, setMealPlan] = useState<MealPlan | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
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
      const result = await incrementAchievement("meal_plans_created");
      if (result.toast) {
        showToast(result.toast.message, "success");
      }
      setMealPlan(response.data.mealPlan);
      showToast("New meal plan generated successfully", "success");
    } catch (error) {
      showToast("Error generating meal plan", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteClick = () => {
    setIsDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    try {
      setIsLoading(true);
      await deleteMealPlan();
      setMealPlan(null);
      setIsDeleteModalOpen(false);
      showToast("Meal plan deleted successfully", "success");
    } catch (error) {
      showToast("Error deleting meal plan", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteCancel = () => {
    setIsDeleteModalOpen(false);
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
          showToast("Meal swapped successfully", "success");
          return updatedPlan;
        });
      }
    } catch (error) {
      showToast("Error swapping meal", "error");
    }
  };

  if (isLoading) {
    return (
      <div className="loading-container">
        <AnimatedTechIcon size={100} speed={4} />
      </div>
    );
  }

  const filteredMealPlan = getFilteredMealPlan();

  return (
    <div
      className="meal-plan-container"
      style={{ marginBottom: 150, marginTop: 50 }}>
      <div className="meal-plan-header">
        <div className="meal-plan-title">
          <h1>Weekly Meal Plan</h1>
        </div>
        {mealPlan && (
          <p className="days-remaining">{getDaysRemaining()} days remaining</p>
        )}
        <button
          onClick={mealPlan ? handleDeleteClick : handleGeneratePlan}
          className={`${
            mealPlan ? "mealplan-delete-button" : "generate-button"
          }`}
          disabled={isLoading}>
          {isLoading ? (
            <div className="loading-indicator">
              <AnimatedTechIcon size={20} speed={4} />
              <span>Processing...</span>
            </div>
          ) : mealPlan ? (
            "Delete Plan"
          ) : (
            "Generate New Plan"
          )}
        </button>
      </div>

      <div
        style={{
          backgroundColor: "rgba(5, 71, 42, 0.1)",
          padding: "12px 20px",
          borderRadius: "8px",
          marginTop: "-20px",
          fontSize: "0.7rem",
          color: "var(--text-color)",
          maxWidth: "850px",
          margin: "20px auto",
        }}>
        <p>
          Your meal plan is generated based on your dietary preferences. For
          more variety try adjusting your settings.
        </p>
        <Link
          to="/recipe"
          style={{
            color: "var(--primary-color)",
            fontWeight: "600",
            whiteSpace: "nowrap",
            textDecoration: "none",
          }}>
          Edit Preferences →
        </Link>
      </div>

      {mealPlan && filteredMealPlan && filteredMealPlan.length > 0 ? (
        <div className="meal-plan-grid">
          {filteredMealPlan.map(([date, meals]) => (
            <div key={date} className="day-card" style={{ borderRadius: 10 }}>
              <h2>{formatDate(date)}</h2>
              <div className="meals-list">
                <MealItem
                  mealType="Breakfast"
                  //@ts-ignore
                  meal={meals.breakfast}
                  accentColor="#FF9D72"
                  date={date}
                  onMealSwap={handleMealSwap}
                  userRecipes={userRecipes}
                />
                <MealItem
                  mealType="Lunch"
                  //@ts-ignore
                  meal={meals.lunch}
                  accentColor="#05472A"
                  date={date}
                  onMealSwap={handleMealSwap}
                  userRecipes={userRecipes}
                />
                <MealItem
                  mealType="Dinner"
                  //@ts-ignore
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
          <p>No meal plan created.</p>
          <p>Select "Generate New Plan" to get started!</p>
          <br />
          <p>
            Our meal plan generator will grab from your saved recipes as well as
            recommend new ones. The more saved recipes it has to pick from, the
            more diverse your results will be.
          </p>
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
      {isDeleteModalOpen && (
        <ConfirmationModal
          message="Are you sure you want to delete your current meal plan?"
          additionalInfo="This action cannot be undone."
          onClose={handleDeleteCancel}
          onConfirm={handleDeleteConfirm}
        />
      )}
    </div>
  );
};

export default MealPlan;
