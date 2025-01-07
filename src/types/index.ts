export interface User {
  id: number;
  name: string;
  username: string;
  email: string;
  avatar: string;
  bio: string;
  city?: string | null;
  state?: string | null;
}

export interface Recipe {
  id: number;
  category: string;
  item: string;
  description: string;
  confidence: number;
  rating: number;
}

export interface DietaryItem {
  id: number;
  userId: number;
  item: string;
}

export interface CantHave extends DietaryItem {}
export interface MustHave extends DietaryItem {}
export interface TastePreference extends DietaryItem {}
export interface DietaryGoal extends DietaryItem {}
export interface CuisinePreference extends DietaryItem {}

export interface Meal {
  title: string;
  isNew: boolean;
  recipeId: number | null;
}

export interface DayPlan {
  breakfast: Meal;
  lunch: Meal;
  dinner: Meal;
}

export interface Plan {
  id: number;
  created_at: string;
  expires_at: string;
  meals: {
    [key: string]: DayPlan;
  };
}