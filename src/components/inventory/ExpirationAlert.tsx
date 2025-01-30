import React, { useState, useEffect } from "react";
import {
  FaChevronDown,
  FaChevronUp,
  FaExclamationTriangle,
} from "react-icons/fa";
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
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set());
  const navigate = useNavigate();

  // Words that are too generic to match on alone
  const genericIngredientWords = new Set([
    "syrup",
    "sauce",
    "oil",
    "vinegar",
    "cream",
    "milk",
    "cheese",
    "flour",
    "sugar",
    "salt",
    "pepper",
    "spice",
    "seasoning",
    "broth",
    "stock",
    "juice",
    "extract",
    "powder",
    "paste",
    "butter",
    "water",
    "wine",
    "bread",
    "rice",
    "pasta",
    "noodles",
  ]);

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

  const doIngredientsMatch = (
    cleanedItem: string,
    cleanedIngredient: string
  ): boolean => {
    const itemWords = cleanedItem.split(" ");
    const ingredientWords = cleanedIngredient.split(" ");

    // Case 1: If either is a single generic word (e.g., just "milk"),
    // match it with any ingredient containing that word
    if (itemWords.length === 1 && genericIngredientWords.has(itemWords[0])) {
      return ingredientWords.includes(itemWords[0]);
    }
    if (
      ingredientWords.length === 1 &&
      genericIngredientWords.has(ingredientWords[0])
    ) {
      return itemWords.includes(ingredientWords[0]);
    }

    // Case 2: For multi-word items, check if one item is a subset of the other
    // This ensures "milk" matches with "whole milk" and vice versa
    const commonGenericWords = itemWords.filter(
      (word) =>
        genericIngredientWords.has(word) && ingredientWords.includes(word)
    );

    if (commonGenericWords.length > 0) {
      // If both contain a generic word, check if one is a subset of the other
      const itemSet = new Set(itemWords);
      const ingredientSet = new Set(ingredientWords);

      // Check if all words from the shorter term appear in the longer term
      if (itemWords.length < ingredientWords.length) {
        return itemWords.every((word) => ingredientSet.has(word));
      } else {
        return ingredientWords.every((word) => itemSet.has(word));
      }
    }

    // Case 3: For all other cases, match on non-generic words
    const itemNonGenericWords = itemWords.filter(
      (word) => !genericIngredientWords.has(word)
    );
    const ingredientNonGenericWords = ingredientWords.filter(
      (word) => !genericIngredientWords.has(word)
    );

    return itemNonGenericWords.some((word) =>
      ingredientNonGenericWords.includes(word)
    );
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
              return doIngredientsMatch(cleanedItemName, cleanedIngredient);
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

  const toggleExpand = (index: number) => {
    setExpandedItems((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  if (items.length === 0) return null;

  const handleRecipeClick = (recipeId: number) => {
    navigate(`/myrecipes/${recipeId}`);
    onClose();
  };

  return (
    <div
      className="recipe-result"
      style={{ marginTop: 100, marginBottom: 200 }}>
      <div className="recipe-section">
        <div className="modal-header">
          <div className="alert-title">
            <FaExclamationTriangle size={24} color="#dc3545" />
            <h2>Items Expiring Soon</h2>
          </div>
        </div>

        <div className="expiring-items-list">
          {items.map((item, index) => {
            const hasRecipes = !isLoading && recipeMatches[item.item_name];
            const isExpanded = expandedItems.has(index);

            return (
              <div key={index} className="expiring-item">
                <div className="expiring-item-content">
                  <div className="expiring-item-header">
                    <div className="expiring-item-info">
                      <p>
                        <strong>{item.item_name}</strong> - {item.quantity}
                      </p>
                      <p className="expiration-date">
                        Expires:{" "}
                        {new Date(item.expiration_date).toLocaleDateString()}
                      </p>
                    </div>
                    {hasRecipes && (
                      <button
                        onClick={() => toggleExpand(index)}
                        className="expand-button">
                        {isExpanded ? <FaChevronUp /> : <FaChevronDown />}
                      </button>
                    )}
                  </div>

                  {isExpanded && (
                    <div
                      className={`matching-recipes ${
                        isExpanded ? "expanded" : ""
                      }`}>
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
            );
          })}
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
