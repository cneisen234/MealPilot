// src/utils/api.ts
import axios, { AxiosError, AxiosResponse } from 'axios';
import { User } from '../types';

const url = process.env.NODE_ENV === 'production' 
  ? '/api'
  : 'http://localhost:5000/api';

const api = axios.create({
  baseURL: url,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response: AxiosResponse) => {
    return response;
  },
  (error: AxiosError) => {
    if (error.response) {
      switch (error.response.status) {
        case 401:
         console.error('UnAuthorized:', error.response.data);
         if(window.location.pathname !== "/login") {
          localStorage.removeItem('token');
          window.location.href = '/login';
         }
          break;
        case 403:
          // Forbidden: you might want to handle this differently
          console.error('Forbidden request:', error.response.data);
          break;
        case 404:
          // Not Found
          console.error('Resource not found:', error.response.data);
          break;
        case 500:
          // Server Error
          console.error('Server error:', error.response.data);
          break;
        default:
          console.error('API error:', error.response.data);
      }
    } else if (error.request) {
      // The request was made but no response was received
      console.error('No response received:', error.request);
    } else {
      // Something happened in setting up the request that triggered an Error
      console.error('Error', error.message);
    }
    return Promise.reject(error);
  }
);

// API methods
export const login = (credentials: { email: string; password: string }) => {
  return api.post('/auth/login', credentials);
};

export const signup = (userData: { name: string; email: string, password: string; }) => {
  return api.post('/auth/signup', userData);
};

export const checkEmailAvailability = (email: string) => {
  return api.get(`/auth/check-email?email=${encodeURIComponent(email)}`);
};

export const checkEmailExists = (email: string) => {
  return api.get(`/auth/check-email-exists?email=${encodeURIComponent(email)}`);
};

export const getProfile = () => {
  return api.get('/users/profile');
};

export const requestPasswordReset = (email: string) => {
  return api.post('/auth/forgot-password', { email });
};

export const resetPassword = (token: string, password: string) => {
  return api.post(`/auth/reset-password/${token}`, { password });
};

export const closeAccount = () => {
  return api.post('/users/close-account');
};

export const updateProfile = async (userId: number, profileData: Partial<User>) => {
  const response = await api.put(`/users/${userId}/profile`, profileData);
  return response.data;
};

// Get selected meal type
export const getSelectedMealType = () => {
  return api.get('/preference/selected-meal-type');
};

// Add selected meal type
export const addSelectedMealType = (item: string) => {
  return api.post('/preference/selected-meal-type', { item });
};

// Get selected servings
export const getSelectedServings = () => {
  return api.get('/preference/selected-servings');
};

// Add selected servings
export const addSelectedServings = (item: string) => {
  return api.post('/preference/selected-servings', { item });
};

// Can't Haves
export const getCantHaves = () => {
  return api.get('/preference/cant-haves');
};

export const addCantHave = (item: string) => {
  return api.post('/preference/cant-haves', { item });
};

export const removeCantHave = (id: number) => {
  return api.delete(`/preference/cant-haves/${id}`);
};

// Must Haves
export const getMustHaves = () => {
  return api.get('/preference/must-haves');
};

export const addMustHave = (item: string) => {
  return api.post('/preference/must-haves', { item });
};

export const removeMustHave = (id: number) => {
  return api.delete(`/preference/must-haves/${id}`);
};

// Taste Preferences
export const getTastePreferences = () => {
  return api.get('/preference/taste');
};

export const addTastePreference = (item: string) => {
  return api.post('/preference/taste', { item });
};

export const removeTastePreference = (id: number) => {
  return api.delete(`/preference/taste/${id}`);
};

// Dietary Goals
export const getDietaryGoals = () => {
  return api.get('/preference/goal');
};

export const addDietaryGoal = (item: string) => {
  return api.post('/preference/goal', { item });
};

export const removeDietaryGoal = (id: number) => {
  return api.delete(`/preference/goal/${id}`);
};

// Cuisine Preferences
export const getCuisinePreferences = () => {
  return api.get('/preference/cuisine');
};

export const addCuisinePreference = (item: string) => {
  return api.post('/preference/cuisine', { item });
};

export const removeCuisinePreference = (id: number) => {
  return api.delete(`/preference/cuisine/${id}`);
};

// Recipe Generation
export const generateRecipe = (mealType?: string, servings?: string) => {
  return api.post('/recipe/create-recipe', { mealType, servings });
};

export const saveRecipe = (recipeData: {
  title: string;
  prepTime: string;
  cookTime: string;
  servings: string;
  ingredients: string[];
  instructions: string[];
  nutritionalInfo: string[];
  mealType: string;
}) => {
  return api.post('/recipe/save-recipe', recipeData);
};

export const getUserRecipes = () => {
  return api.get('/recipe/myrecipes');
};

export const getRecipe = (id: string) => {
  return api.get(`/recipe/myrecipes/${id}`);
};

export const getRecipeInventory = (id: string) => {
  return api.get(`/recipe/myrecipesinventory/${id}`);
};

export const updateRecipe = (id: string, recipeData: {
  title: string;
  prepTime: string;
  cookTime: string;
  servings: string;
  ingredients: string[];
  instructions: string[];
  nutritionalInfo: string[];
  mealType: string;
}) => {
  return api.put(`/recipe/myrecipes/${id}`, recipeData);
};

export const deleteRecipe = (id: string) => {
  return api.delete(`/recipe/myrecipes/${id}`);
};

export const scrapeRecipe = (url: string) => {
  return api.post('/recipe/scrape-recipe', { url });
};

export const extractRecipeFromImage = (imageData: string) => {
  return api.post('/recipe/ocr-recipe', { imageData });
};

export const getCurrentMealPlan = () => {
  return api.get('/mealplan/current');
};

export const generateMealPlan = () => {
  return api.post('/mealplan/generate');
};

// Inventory Management
export const getInventoryItems = () => {
  return api.get('/inventory');
};

export const addInventoryItem = (itemData: {
  item_name: string;
  quantity: number;
  expiration_date: string;
}) => {
  return api.post('/inventory', itemData);
};

export const updateInventoryItem = (
  id: number,
  itemData: {
    item_name: string;
    quantity: number;
    expiration_date: string;
  }
) => {
  return api.put(`/inventory/${id}`, itemData);
};

export const deleteInventoryItem = (id: number, quantity: number) => {
  return api.put(`/inventory/delete/${id}`, {quantity});
};

export const deleteInventoryItemByName = async (
  itemName: string,
  quantity: number
) => {
  return api.put(`/inventory/delete-by-name/${itemName}`, { quantity });
};

export interface ShoppingListItem {
  id: number;
  item_name: string;
  quantity: number;
  tagged_recipes: Array<{
    id: number;
    title: string;
  }>;
}

export const getShoppingList = () => {
  return api.get('/shopping-list');
};

export const addShoppingListItem = (itemData: {
  item_name: string;
  quantity: number;
  recipe_ids?: number[];
}) => {
  return api.post('/shopping-list', itemData);
};

export const updateShoppingListItem = (
  id: number,
  itemData: {
    item_name: string;
    quantity: number;
    recipe_ids?: number[];
  }
) => {
  return api.put(`/shopping-list/${id}`, itemData);
};

export const deleteShoppingListItem = (id: number, quantity: number) => {
  return api.put(`/shopping-list/delete/${id}`, {quantity});
};

export const moveToInventory = (id: number, expiration_date: string) => {
  return api.post(`/shopping-list/${id}/move-to-inventory`, { expiration_date });
};

export const moveToInventoryByName = (item_name: string, expiration_date: string) => {
  return api.post(`/shopping-list/${item_name}/move-to-inventory-by-name`, { expiration_date });
};

export const processReceipt = (imageData: string) => {
  return api.post('/shopping-list/process-receipt', { imageData });
};

export const addMultipleToShoppingList = async (items: Array<{
  item_name: string;
  quantity: number;
}>) => {
  return api.post('/shopping-list/bulk-add-shopping', { items });
};

export const addMultiItemsToInventory = (items: Array<{
  shopping_list_id: number;
  shopping_list_item: string;
  quantity: number;
}>) => {
  return api.post('/shopping-list/bulk-add', { items });
};

export const createSharedList = (items: any[], shareId: string) => {
  return api.post(`/shared-list/create/${shareId}`, { items });
};

// Get a shared list by ID
export const getSharedList = (shareId: string) => {
  return api.get(`/shared-list/get/${shareId}`);
};

// Update shopping list item by name
export const updateShoppingListItemByName = (itemData: {
  item_name: string;
  quantity: number;
  recipe_ids?: number[];
}) => {
  return api.put(`/shopping-list/update-by-name/${itemData.item_name}`, itemData);
};

export const processShoppingItemPhoto = (imageData: string) => {
  return api.post('/shopping-list/analyze-item', { imageData });
};

export const processInventoryItemPhoto = (imageData: string) => {
  return api.post('/inventory/analyze-item', { imageData });
};

export const swapMealWithSaved = async (date: string, mealType: string, recipeId: number) => {
  return await api.post('/mealplan/update', {
    date,
    mealType,
    recipeId
  });
};

const huggingFaceApi = axios.create({
  headers: {
    'Content-Type': 'application/json',
  },
});

export const analyzeImageWithHuggingFace = async (file: File): Promise<string> => {
  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
  
  const makeRequest = async (retries = 3): Promise<string> => {
    try {
      const base64data = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          //@ts-ignore
          const base64 = reader.result.toString().split(',')[1];
          resolve(base64);
        };
        reader.readAsDataURL(file);
      });

      const response = await huggingFaceApi.post(
        'https://api-inference.huggingface.co/models/facebook/detr-resnet-50',
        { inputs: base64data },
        {
          headers: {
            'Authorization': `Bearer ${process.env.REACT_APP_HUGGING_FACE_API_KEY}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return response.data
        
      throw new Error('No objects detected');
      
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 503) {
        // Get estimated time from error response or default to 20 seconds
        const estimatedTime = error.response.data.estimated_time || 20;
        
        if (retries > 0) {
          console.log(`Model is loading, retrying in ${estimatedTime} seconds...`);
          await delay(estimatedTime * 1000);
          return makeRequest(retries - 1);
        }
      }
      throw error;
    }
  };

  return makeRequest();
};

export const deleteMealPlan = () => {
  return api.delete('/mealplan/current');
};

export const moveToShoppingList = async (itemId: number) => {
  return await api.post(`/shopping-list/from-inventory/${itemId}`);
};

export default api;

