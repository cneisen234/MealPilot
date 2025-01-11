import React, { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import {
  getRecipe,
  getRecipeInventory,
  updateRecipe,
  deleteRecipe,
} from "../../utils/api";
import AnimatedTechIcon from "../common/AnimatedTechIcon";
import {
  FaEdit,
  FaTrash,
  FaTimes,
  FaSave,
  FaCheck,
  FaExclamationTriangle,
  FaArrowLeft,
} from "react-icons/fa";
import ConfirmDeleteModal from "../common/ConfirmDeleteModal";
import CookingMode from "../cooking/CookingMode";
import RecipePDF from "./RecipePdf";

interface IngredientAnalysis {
  original: string;
  parsed?: {
    quantity: number;
    name: string;
  };
  status: {
    type: "in-inventory" | "in-shopping-list" | "missing" | "unparseable";
    hasEnough?: boolean;
    available?: {
      quantity: number;
      id: number;
    };
    quantity?: number;
    shopping_id?: number;
  };
}

interface Recipe {
  id: number;
  title: string;
  prep_time: string;
  cook_time: string;
  servings: string;
  ingredients: IngredientAnalysis[];
  instructions: string[];
  nutritional_info: string[];
}

interface IngredientQuantities {
  [key: number]: number;
}

const RecipeDetail: React.FC = () => {
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editedRecipe, setEditedRecipe] = useState<Recipe | null>(null);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isCookingMode, setIsCookingMode] = useState(false);
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const routeLocation = useLocation();
  const fromMealPlan = routeLocation.state?.fromMealPlan;
  let currentStep = 1;

  const createPlaceholderAnalysis = (
    ingredient: string
  ): IngredientAnalysis => ({
    original: ingredient,
    parsed: undefined,
    status: {
      type: "unparseable",
      hasEnough: false,
    },
  });

  useEffect(() => {
    loadRecipe();
  }, [id]);

  const loadRecipe = async () => {
    if (!id) return;

    try {
      const response = await getRecipe(id);
      // Transform the ingredients into the consistent format
      const formattedRecipe = {
        ...response.data,
        ingredients: response.data.ingredients.map(
          (ing: string | IngredientAnalysis) => {
            if (typeof ing === "string") {
              return createPlaceholderAnalysis(ing);
            }
            return ing;
          }
        ),
      };
      setRecipe(formattedRecipe);
      setEditedRecipe(formattedRecipe);
    } catch (error) {
      console.error("Error loading recipe:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAnalyzeIngredients = async () => {
    if (!id || !recipe) return;

    setIsAnalyzing(true);
    try {
      const response = await getRecipeInventory(id);
      setRecipe(response.data);
    } catch (error) {
      console.error("Error analyzing ingredients:", error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleEditClick = () => {
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setEditedRecipe(recipe);
    setIsEditing(false);
  };

  console.log(recipe);

  const handleBasicInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!editedRecipe) return;

    const { name, value } = e.target;
    setEditedRecipe((prev) => ({
      ...prev!,
      [name]: value,
    }));
  };

  const handleArrayInputChange = (
    index: number,
    value: string,
    field: "ingredients" | "instructions" | "nutritional_info"
  ) => {
    if (!editedRecipe) return;

    setEditedRecipe((prev) => ({
      ...prev!,
      [field]: prev![field].map((item, i) => (i === index ? value : item)),
    }));
  };

  const addArrayItem = (
    field: "ingredients" | "instructions" | "nutritional_info"
  ) => {
    if (!editedRecipe) return;

    setEditedRecipe((prev) => ({
      ...prev!,
      [field]: [...prev![field], ""],
    }));
  };

  const removeArrayItem = (
    index: number,
    field: "ingredients" | "instructions" | "nutritional_info"
  ) => {
    if (!editedRecipe) return;

    setEditedRecipe((prev) => ({
      ...prev!,
      //@ts-ignore
      [field]: prev![field].filter((_, i) => i !== index),
    }));
  };

  const handleSave = async () => {
    if (!editedRecipe || !id) return;
    const ingredentsTitle = editedRecipe.ingredients.map((i) => i.original);
    setIsSaving(true);
    try {
      await updateRecipe(id, {
        title: editedRecipe.title,
        prepTime: editedRecipe.prep_time,
        cookTime: editedRecipe.cook_time,
        servings: editedRecipe.servings,
        //@ts-ignore
        ingredients: ingredentsTitle.filter((item) => item.trim()),
        instructions: editedRecipe.instructions.filter((item) => item.trim()),
        nutritionalInfo: editedRecipe.nutritional_info.filter((item) =>
          item.trim()
        ),
      });
      await loadRecipe();
      setIsEditing(false);
    } catch (error) {
      console.error("Error updating recipe:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const openDeleteConfirmModal = () => {
    setIsDeleteConfirmOpen(true);
  };

  const closeDeleteConfirmModal = () => {
    setIsDeleteConfirmOpen(false);
  };

  const handleDelete = async () => {
    if (!id) return;

    try {
      await deleteRecipe(id);
      navigate("/myrecipes");
    } catch (error) {
      console.error("Error deleting recipe:", error);
    }
  };

  const handleBack = () => {
    if (fromMealPlan) {
      navigate("/mealplan");
    } else {
      navigate("/myrecipes");
    }
  };

  if (isLoading || isSaving) {
    return (
      <div className="loading-container">
        <AnimatedTechIcon size={100} speed={4} />
      </div>
    );
  }

  if (!recipe) {
    return <div>Recipe not found</div>;
  }

  if (isEditing && editedRecipe) {
    return (
      <div id="recipe-details" className="recipe-result">
        <div className="recipe-actions">
          <button
            onClick={handleCancelEdit}
            className="recipe-action-button back-button">
            <FaTimes />
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="recipe-action-button save-button">
            <FaSave />
          </button>
        </div>

        <div className="recipe-form-title">
          <input
            type="text"
            name="title"
            value={editedRecipe.title}
            onChange={handleBasicInputChange}
            className="title-input"
            required
          />
        </div>

        <div className="recipe-meta">
          <div className="recipe-meta-item">
            <label className="meta-label">Prep Time</label>
            <input
              type="text"
              name="prep_time"
              value={editedRecipe.prep_time}
              onChange={handleBasicInputChange}
              className="meta-input"
            />
          </div>
          <div className="recipe-meta-item">
            <label className="meta-label">Cook Time</label>
            <input
              type="text"
              name="cook_time"
              value={editedRecipe.cook_time}
              onChange={handleBasicInputChange}
              className="meta-input"
            />
          </div>
          <div className="recipe-meta-item">
            <label className="meta-label">Servings</label>
            <input
              type="text"
              name="servings"
              value={editedRecipe.servings}
              onChange={handleBasicInputChange}
              className="meta-input"
            />
          </div>
        </div>

        <div className="recipe-section">
          <h2>Ingredients</h2>
          <div className="recipe-array-inputs">
            {editedRecipe.ingredients.map((ingredient, index) => (
              <div key={index} className="array-input-row">
                <input
                  type="text"
                  value={ingredient.original}
                  onChange={(e) =>
                    handleArrayInputChange(index, e.target.value, "ingredients")
                  }
                  className="array-input"
                />
                <button
                  type="button"
                  onClick={() => removeArrayItem(index, "ingredients")}
                  className="remove-item-button">
                  <FaTimes />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => addArrayItem("ingredients")}
              className="add-item-button">
              Add Ingredient
            </button>
          </div>
        </div>

        <div className="recipe-section">
          <h2>Instructions</h2>
          <p
            style={{
              marginBottom: "15px",
              fontSize: "0.9rem",
              color: "var(--secondary-color)",
              fontStyle: "italic",
            }}>
            Tip: Wrap steps with double stars (**) to create numbered items. For
            example, "**Prepare ingredients**" will appear as "1. Prepare
            ingredients"
          </p>
          <div className="recipe-array-inputs">
            {editedRecipe.instructions.map((instruction, index) => (
              <div key={index} className="array-input-row">
                <input
                  type="text"
                  value={instruction}
                  onChange={(e) =>
                    handleArrayInputChange(
                      index,
                      e.target.value,
                      "instructions"
                    )
                  }
                  className="array-input"
                />
                <button
                  type="button"
                  onClick={() => removeArrayItem(index, "instructions")}
                  className="remove-item-button">
                  <FaTimes />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => addArrayItem("instructions")}
              className="add-item-button">
              Add Step
            </button>
          </div>
        </div>

        <div className="recipe-section">
          <h2>Nutritional Information</h2>
          <div className="recipe-array-inputs">
            {editedRecipe.nutritional_info.map((info, index) => (
              <div key={index} className="array-input-row">
                <input
                  type="text"
                  value={info}
                  onChange={(e) =>
                    handleArrayInputChange(
                      index,
                      e.target.value,
                      "nutritional_info"
                    )
                  }
                  className="array-input"
                />
                <button
                  type="button"
                  onClick={() => removeArrayItem(index, "nutritional_info")}
                  className="remove-item-button">
                  <FaTimes />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => addArrayItem("nutritional_info")}
              className="add-item-button">
              Add Nutritional Info
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Display mode
  return (
    <div className="recipe-result">
      <div className="recipe-actions">
        <button
          onClick={handleBack}
          className="recipe-action-button back-button">
          <FaArrowLeft className="button-icon" />
        </button>
        <button
          onClick={() => setIsCookingMode(true)}
          className="recipe-action-button back-button">
          Start Cooking
        </button>
        <button
          onClick={handleEditClick}
          className="recipe-action-button edit-button">
          <FaEdit />
        </button>
        <button
          onClick={openDeleteConfirmModal}
          className="recipe-action-button delete-button">
          <FaTrash />
        </button>
      </div>
      <h1 className="recipe-title">{recipe.title}</h1>
      <RecipePDF recipe={recipe} />
      <div className="recipe-meta">
        {recipe.prep_time && (
          <div className="recipe-meta-item">
            <span className="meta-label">Prep Time</span>
            <span className="meta-value">{recipe.prep_time}</span>
          </div>
        )}
        {recipe.cook_time && (
          <div className="recipe-meta-item">
            <span className="meta-label">Cook Time</span>
            <span className="meta-value">{recipe.cook_time}</span>
          </div>
        )}
        {recipe.servings && (
          <div className="recipe-meta-item">
            <span className="meta-label">Servings</span>
            <span className="meta-value">{recipe.servings}</span>
          </div>
        )}
      </div>
      <div className="recipe-section">
        <div>
          <h2>Ingredients</h2>
          <button
            onClick={handleAnalyzeIngredients}
            className="analyze-button"
            disabled={isAnalyzing}>
            {isAnalyzing && <AnimatedTechIcon size={20} speed={4} />}
            {isAnalyzing ? "Analyzing..." : "Check Stock"}
          </button>
        </div>
        <ul className="recipe-list">
          {recipe.ingredients.map((ingredient, index) => (
            <li key={`ingredient-${index}`} className="recipe-list-item">
              <div className="ingredient-content">
                <span className="ingredient-text">{ingredient.original}</span>
                <br />
                {ingredient.status.type === "in-inventory" && (
                  <div
                    className="ingredient-status-wrapper"
                    style={{ width: 215 }}>
                    <div className="ingredient-status sufficient">
                      <FaCheck />
                      <span>In Stock</span>
                    </div>
                  </div>
                )}
                {(ingredient.status.type === "in-shopping-list" ||
                  (ingredient.status.type === "missing" &&
                    ingredient.parsed)) && (
                  <div className="ingredient-actions">
                    <div className="quantity-wrapper">
                      <div
                        className="ingredient-status-wrapper"
                        style={{ width: 215, marginBottom: 5 }}>
                        <div className="ingredient-status insufficient">
                          <FaExclamationTriangle />
                          <span>
                            {" "}
                            {ingredient.status.type === "in-shopping-list"
                              ? "In Shopping List"
                              : "Not Found"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>
      <div className="recipe-section">
        <h2>Instructions</h2>
        <div className="recipe-list">
          {recipe.instructions.map((instruction, index) => {
            const isMainStep =
              instruction.startsWith("**") && instruction.endsWith("**");
            const content = isMainStep
              ? `${currentStep}. ${instruction.slice(2, -2)}`
              : `- ${instruction}`;

            isMainStep && currentStep++;

            return (
              <React.Fragment key={`instruction-${index}`}>
                {isMainStep && <br />}
                <div
                  className="recipe-list-item"
                  style={!isMainStep ? { marginLeft: "20px" } : {}}>
                  {content}
                </div>
              </React.Fragment>
            );
          })}
        </div>
      </div>
      <div className="recipe-section">
        <h2>Nutritional Information</h2>
        <ul className="recipe-list nutrition-list">
          {recipe.nutritional_info.map((info, index) => (
            <li key={`nutrition-${index}`} className="recipe-list-item">
              {info}
            </li>
          ))}
        </ul>
      </div>
      {isDeleteConfirmOpen && (
        <ConfirmDeleteModal
          isOpen={isDeleteConfirmOpen}
          onClose={closeDeleteConfirmModal}
          onConfirm={handleDelete}
          item_name={recipe.title}
        />
      )}
      {isCookingMode && (
        <CookingMode recipe={recipe} onClose={() => setIsCookingMode(false)} />
      )}
    </div>
  );
};

export default RecipeDetail;
