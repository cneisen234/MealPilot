import React, { useState, useEffect } from "react";
import { CantHave, MustHave } from "../types";
import { FaPlus, FaTimes } from "react-icons/fa";
import AnimatedTechIcon from "../components/common/AnimatedTechIcon";
import {
  getCantHaves,
  addCantHave,
  removeCantHave,
  getMustHaves,
  addMustHave,
  removeMustHave,
  generateRecipe,
} from "../utils/api";
import "../styles/recipe.css";

const PreferenceInput: React.FC<{
  label: string;
  description: string;
  placeholder: string;
  items: Array<CantHave | MustHave>;
  onAdd: (value: string) => Promise<void>;
  onRemove: (id: number) => Promise<void>;
}> = ({ label, description, placeholder, items, onAdd, onRemove }) => {
  const [value, setValue] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!value.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await onAdd(value.trim());
      setValue("");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="preference-section">
      <h3>{label}</h3>
      <p>{description}</p>

      <form onSubmit={handleSubmit}>
        <div className="input-group">
          <input
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={placeholder}
            className="preference-input"
            disabled={isSubmitting}
          />
          <button type="submit" disabled={isSubmitting} className="add-button">
            <FaPlus size={14} />
            Add
          </button>
        </div>
      </form>

      <div className="items-container">
        {items.map((item) => (
          <div key={item.id} className="preference-item">
            <span>{item.value}</span>
            <button
              onClick={() => onRemove(item.id)}
              className="remove-button"
              aria-label="Remove item">
              <FaTimes size={14} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

const Recipe: React.FC = () => {
  const [cantHaves, setCantHaves] = useState<CantHave[]>([]);
  const [mustHaves, setMustHaves] = useState<MustHave[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      const [cantHavesRes, mustHavesRes] = await Promise.all([
        getCantHaves(),
        getMustHaves(),
      ]);
      setCantHaves(cantHavesRes.data);
      setMustHaves(mustHavesRes.data);
    } catch (error) {
      console.error("Error loading preferences:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddCantHave = async (value: string) => {
    try {
      await addCantHave(value);
      const response = await getCantHaves();
      setCantHaves(response.data);
    } catch (error) {
      console.error("Error adding cant-have:", error);
    }
  };

  const handleRemoveCantHave = async (id: number) => {
    try {
      await removeCantHave(id);
      const response = await getCantHaves();
      setCantHaves(response.data);
    } catch (error) {
      console.error("Error removing cant-have:", error);
    }
  };

  const handleAddMustHave = async (value: string) => {
    try {
      await addMustHave(value);
      const response = await getMustHaves();
      setMustHaves(response.data);
    } catch (error) {
      console.error("Error adding must-have:", error);
    }
  };

  const handleRemoveMustHave = async (id: number) => {
    try {
      await removeMustHave(id);
      const response = await getMustHaves();
      setMustHaves(response.data);
    } catch (error) {
      console.error("Error removing must-have:", error);
    }
  };

  const handleGenerateRecipe = async () => {
    setIsGenerating(true);
    try {
      await generateRecipe();
      // Handle response when backend is implemented
    } catch (error) {
      console.error("Error generating recipe:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="loading-container">
        <AnimatedTechIcon size={100} speed={4} />
      </div>
    );
  }

  return (
    <div className="recipe-container">
      <div className="recipe-header">
        <h1>Recipe Preferences</h1>
        <p>
          Customize your dietary preferences to get personalized recipe
          recommendations.
        </p>
      </div>

      <div className="preferences-grid">
        <PreferenceInput
          label="Can't Haves"
          description="Add ingredients or foods that you cannot or prefer not to eat."
          placeholder="Enter an ingredient you can't eat..."
          items={cantHaves}
          onAdd={handleAddCantHave}
          onRemove={handleRemoveCantHave}
        />

        <PreferenceInput
          label="Must Haves"
          description="Add ingredients or foods that you want to include in your recipes."
          placeholder="Enter an ingredient you must have..."
          items={mustHaves}
          onAdd={handleAddMustHave}
          onRemove={handleRemoveMustHave}
        />
      </div>

      <div className="generate-container">
        <button
          onClick={handleGenerateRecipe}
          disabled={isGenerating}
          className="generate-button">
          {isGenerating ? (
            <>
              <AnimatedTechIcon size={24} speed={4} />
              Generating Recipe...
            </>
          ) : (
            "Generate Recipe"
          )}
        </button>
      </div>
    </div>
  );
};

export default Recipe;
