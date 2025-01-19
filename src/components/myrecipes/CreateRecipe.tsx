import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { saveRecipe } from "../../utils/api";
import { FaSave, FaTimes } from "react-icons/fa";
import "../../styles/createrecipe.css";
import RecipeImport from "./RecipeImport";

interface RecipeFormData {
  title: string;
  prepTime: string;
  cookTime: string;
  servings: string;
  ingredients: string[];
  instructions: string[];
  nutritionalInfo: string[];
  mealType: string;
}

const CreateRecipe: React.FC = () => {
  const navigate = useNavigate();
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState<RecipeFormData>({
    title: "",
    prepTime: "",
    cookTime: "",
    servings: "",
    ingredients: [],
    instructions: [],
    nutritionalInfo: [],
    mealType: "",
  });

  const handleBasicInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleArrayInputChange = (
    index: number,
    value: string,
    field: "ingredients" | "instructions" | "nutritionalInfo"
  ) => {
    setFormData((prev) => ({
      ...prev,
      [field]: prev[field].map((item, i) => (i === index ? value : item)),
    }));
  };

  const addArrayItem = (
    field: "ingredients" | "instructions" | "nutritionalInfo"
  ) => {
    setFormData((prev) => ({
      ...prev,
      [field]: [...prev[field], ""],
    }));
  };

  const removeArrayItem = (
    index: number,
    field: "ingredients" | "instructions" | "nutritionalInfo"
  ) => {
    setFormData((prev) => ({
      ...prev,
      [field]: prev[field].filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      // Clean up empty entries
      const cleanedData = {
        ...formData,
        ingredients: formData.ingredients.filter((item) => item.trim()),
        instructions: formData.instructions.filter((item) => item.trim()),
        nutritionalInfo: formData.nutritionalInfo.filter((item) => item.trim()),
      };

      await saveRecipe(cleanedData);
      navigate("/myrecipes");
    } catch (error) {
      console.error("Error saving recipe:", error);
      // Could add error notification here
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="recipe-result" style={{ marginBottom: 150 }}>
      <RecipeImport
        onRecipeImported={(recipe) => {
          setFormData({
            ...formData,
            title: recipe.title,
            prepTime: recipe.prepTime,
            cookTime: recipe.cookTime,
            servings: recipe.servings,
            ingredients: recipe.ingredients,
            instructions: recipe.instructions,
            nutritionalInfo: recipe.nutritionalInfo,
            mealType: recipe.meaType,
          });
        }}
      />
      <form onSubmit={handleSubmit}>
        <div className="recipe-actions">
          <button
            type="button"
            onClick={() => navigate("/myrecipes")}
            style={{ display: "flex", alignItems: "center", marginRight: 45 }}
            className="recipe-action-button back-button">
            <FaTimes style={{ marginRight: 8 }} /> Cancel
          </button>
          <button
            type="submit"
            disabled={isSaving}
            style={{ display: "flex", alignItems: "center" }}
            className="recipe-action-button save-button">
            <FaSave style={{ marginRight: 8 }} />{" "}
            {isSaving ? "Saving..." : "Save Recipe"}
          </button>
        </div>

        <div className="recipe-form-title" style={{ marginTop: 30 }}>
          <input
            type="text"
            name="title"
            value={formData.title}
            onChange={handleBasicInputChange}
            placeholder="Recipe Title"
            className="title-input"
            required
          />
        </div>

        <div className="recipe-meta">
          <div className="recipe-meta-item">
            <label className="meta-label">Prep Time</label>
            <input
              type="text"
              name="prepTime"
              value={formData.prepTime}
              onChange={handleBasicInputChange}
              className="meta-input"
            />
          </div>
          <div className="recipe-meta-item">
            <label className="meta-label">Cook Time</label>
            <input
              type="text"
              name="cookTime"
              value={formData.cookTime}
              onChange={handleBasicInputChange}
              className="meta-input"
            />
          </div>
          <div className="recipe-meta-item">
            <label className="meta-label">Servings</label>
            <input
              type="text"
              name="servings"
              value={formData.servings}
              onChange={handleBasicInputChange}
              className="meta-input"
            />
          </div>
        </div>

        <div className="recipe-section">
          <h2>Ingredients</h2>
          <div className="recipe-array-inputs">
            {formData.ingredients.map((ingredient, index) => (
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
          <div className="recipe-array-inputs">
            {formData.instructions.map((instruction, index) => (
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
            {formData.nutritionalInfo.map((info, index) => (
              <div key={index} className="array-input-row">
                <input
                  type="text"
                  value={info}
                  onChange={(e) =>
                    handleArrayInputChange(
                      index,
                      e.target.value,
                      "nutritionalInfo"
                    )
                  }
                  className="array-input"
                />
                <button
                  type="button"
                  onClick={() => removeArrayItem(index, "nutritionalInfo")}
                  className="remove-item-button">
                  <FaTimes />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => addArrayItem("nutritionalInfo")}
              className="add-item-button">
              Add Nutritional Info
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default CreateRecipe;
