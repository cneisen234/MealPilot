import React, { useState, useEffect } from "react";
import { FaExclamationTriangle } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { getUserRecipes } from "../../utils/api";

interface Recipe {
  id: number;
  title: string;
  ingredients: string[];
}

interface ExpirationAlertProps {
  items: Array<{
    item_name: string;
    expiration_date: string;
    quantity: number;
  }>;
  onClose: () => void;
}

interface RecipeMatch {
  recipeId: number;
  title: string;
}

const ExpirationAlert: React.FC<ExpirationAlertProps> = ({
  items,
  onClose,
}) => {
  const [recipeMatches, setRecipeMatches] = useState<
    Record<string, RecipeMatch[]>
  >({});
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  // Helper function to extract clean item name
  const extractItemName = (original: string) => {
    let processed = original.toLowerCase();
    processed = processed.replace(/\d+(\.\d+)?(\s*\/\s*\d+)?/g, "");

    const measurements = [
      "cup",
      "cups",
      "tablespoon",
      "tablespoons",
      "tbsp",
      "teaspoon",
      "teaspoons",
      "tsp",
      "pound",
      "pounds",
      "lb",
      "lbs",
      "ounce",
      "ounces",
      "oz",
      "gram",
      "grams",
      "g",
      "ml",
      "milliliter",
      "milliliters",
      "pinch",
      "pinches",
      "dash",
      "dashes",
      "handful",
      "handfuls",
      "piece",
      "pieces",
      "slice",
      "slices",
      "can",
      "cans",
      "package",
      "packages",
      "bottle",
      "bottles",
    ];

    measurements.forEach((measure) => {
      const measureRegex = new RegExp(`\\b${measure}s?\\b`, "g");
      processed = processed.replace(measureRegex, "");
    });

    const connectors = [
      "of",
      "the",
      "a",
      "an",
      "fresh",
      "chopped",
      "diced",
      "sliced",
      "minced",
      "ground",
      "frozen",
      "canned",
      "dried",
      "raw",
      "cooked",
    ];

    connectors.forEach((connector) => {
      const connectorRegex = new RegExp(`\\b${connector}\\b`, "g");
      processed = processed.replace(connectorRegex, "");
    });

    return processed.replace(/[.,]|(\s+)/g, " ").trim();
  };

  useEffect(() => {
    const findMatchingRecipes = async () => {
      try {
        const response = await getUserRecipes();
        const recipes: Recipe[] = response.data;
        const matches: Record<string, RecipeMatch[]> = {};

        // Process each expiring item
        items.forEach((item) => {
          const cleanedItemName = extractItemName(item.item_name);

          // Find recipes that use this specific item
          const itemMatches = recipes.filter((recipe) => {
            return recipe.ingredients.some((ingredient) => {
              const cleanedIngredient = extractItemName(ingredient);
              const itemWords = cleanedItemName.split(" ");
              const ingredientWords = cleanedIngredient.split(" ");

              // Check for word matches in either direction
              return (
                itemWords.some((word) => ingredientWords.includes(word)) ||
                ingredientWords.some((word) => itemWords.includes(word))
              );
            });
          });

          // Only add to matches if there are actual matches for this item
          if (itemMatches.length > 0) {
            matches[item.item_name] = itemMatches.map((recipe) => ({
              recipeId: recipe.id,
              title: recipe.title,
            }));
          }
        });

        setRecipeMatches(matches);
        setIsLoading(false);
      } catch (error) {
        console.error("Error fetching recipes:", error);
        setIsLoading(false);
      }
    };

    findMatchingRecipes();
  }, [items]);

  if (items.length === 0) return null;

  const handleRecipeClick = (recipeId: number) => {
    navigate(`/myrecipes/${recipeId}`);
    onClose();
  };

  return (
    <div className="recipe-result" style={{ marginTop: 100 }}>
      <div className="recipe-section">
        <div className="modal-header">
          <div className="alert-title">
            <FaExclamationTriangle size={24} color="#dc3545" />
            <h2>Items Expiring Soon</h2>
          </div>
        </div>

        <div className="expiring-items-list">
          {items.map((item, index) => (
            <div key={index} className="expiring-item">
              <div className="expiring-item-content">
                <div className="expiring-item-info">
                  <p>
                    <strong>{item.item_name}</strong> - {item.quantity}
                  </p>
                  <p className="expiration-date">
                    Expires:{" "}
                    {new Date(item.expiration_date).toLocaleDateString()}
                  </p>
                </div>
                {!isLoading && recipeMatches[item.item_name] && (
                  <div className="matching-recipes">
                    <p className="recipes-label">Used in:</p>
                    <div className="recipe-links">
                      {recipeMatches[item.item_name].map((recipe) => (
                        <button
                          key={recipe.recipeId}
                          className="recipe-link-button"
                          onClick={() => handleRecipeClick(recipe.recipeId)}>
                          {recipe.title}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="modal-footer">
          <button onClick={onClose} className="submit-button">
            Okay
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExpirationAlert;
