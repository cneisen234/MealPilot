import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { getCurrentMealPlan, generateMealPlan } from "../utils/api";
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

  useEffect(() => {
    loadMealPlan();
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

  const getDaysRemaining = () => {
    if (!mealPlan) return null;
    const expiryDate = new Date(mealPlan.expires_at);
    const today = new Date();
    const diffTime = expiryDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  if (isLoading) {
    return (
      <div className="loading-container">
        <AnimatedTechIcon size={100} speed={4} />
        <p>This might take some time...</p>
      </div>
    );
  }

  return (
    <div className="meal-plan-container">
      <div className="meal-plan-header">
        <div className="meal-plan-title">
          <h1>Weekly Meal Plan</h1>
          {mealPlan && (
            <p className="days-remaining">
              {getDaysRemaining()} days remaining
            </p>
          )}
        </div>
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

      {mealPlan ? (
        <div className="meal-plan-grid">
          {Object.entries(mealPlan.meals)
            .sort(
              ([dateA], [dateB]) =>
                new Date(dateA).getTime() - new Date(dateB).getTime() + 86400000
            )
            .map(([date, meals]) => (
              <div key={date} className="day-card">
                <h2>{formatDate(date)}</h2>
                <div className="meals-list">
                  <MealItem
                    mealType="Breakfast"
                    meal={meals.breakfast}
                    accentColor="#FF9D72"
                  />
                  <MealItem
                    mealType="Lunch"
                    meal={meals.lunch}
                    accentColor="#05472A"
                  />
                  <MealItem
                    mealType="Dinner"
                    meal={meals.dinner}
                    accentColor="#a1c800"
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
