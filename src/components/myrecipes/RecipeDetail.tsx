import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getRecipe, updateRecipe, deleteRecipe } from "../../utils/api";
import AnimatedTechIcon from "../common/AnimatedTechIcon";
import { FaEdit, FaTrash, FaTimes, FaSave } from "react-icons/fa";
import ConfirmDeleteModal from "../common/ConfirmDeleteModal";

interface Recipe {
  id: number;
  title: string;
  prep_time: string;
  cook_time: string;
  servings: string;
  ingredients: string[];
  instructions: string[];
  nutritional_info: string[];
}

const RecipeDetail: React.FC = () => {
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editedRecipe, setEditedRecipe] = useState<Recipe | null>(null);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  let currentStep = 1;

  useEffect(() => {
    loadRecipe();
  }, [id]);

  const loadRecipe = async () => {
    if (!id) return;

    try {
      const response = await getRecipe(id);
      setRecipe(response.data);
      setEditedRecipe(response.data);
    } catch (error) {
      console.error("Error loading recipe:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditClick = () => {
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setEditedRecipe(recipe);
    setIsEditing(false);
  };

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
      [field]: prev![field].filter((_, i) => i !== index),
    }));
  };

  const handleSave = async () => {
    if (!editedRecipe || !id) return;

    setIsSaving(true);
    try {
      const response = await updateRecipe(id, {
        title: editedRecipe.title,
        prepTime: editedRecipe.prep_time,
        cookTime: editedRecipe.cook_time,
        servings: editedRecipe.servings,
        ingredients: editedRecipe.ingredients.filter((item) => item.trim()),
        instructions: editedRecipe.instructions.filter((item) => item.trim()),
        nutritionalInfo: editedRecipe.nutritional_info.filter((item) =>
          item.trim()
        ),
      });

      setRecipe(response.data);
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

  if (isLoading) {
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
      <div className="recipe-result">
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
                  value={ingredient}
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
          onClick={() => navigate("/myrecipes")}
          className="recipe-action-button back-button">
          Go Back
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
        <h2>Ingredients</h2>
        <ul className="recipe-list">
          {recipe.ingredients.map((ingredient, index) => (
            <li key={`ingredient-${index}`} className="recipe-list-item">
              {ingredient}
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
          itemName={recipe.title}
        />
      )}
    </div>
  );
};

export default RecipeDetail;
