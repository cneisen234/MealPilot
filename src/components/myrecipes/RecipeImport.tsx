import React, { useState } from "react";
import { FaLink, FaCamera, FaArrowLeft } from "react-icons/fa";
import { extractRecipeFromImage, scrapeRecipe } from "../../utils/api";
import AnimatedTechIcon from "../common/AnimatedTechIcon";
import PhotoCaptureModal from "../common/PhotoCaptureComponent";
import { useToast } from "../../context/ToastContext";
import { useAuth } from "../../context/AuthContext";

interface RecipeImportProps {
  onRecipeImported: (recipe: {
    meaType: any;
    title: string;
    prepTime: string;
    cookTime: string;
    servings: string;
    ingredients: string[];
    instructions: string[];
    nutritionalInfo: string[];
  }) => void;
}

const RecipeImport: React.FC<RecipeImportProps> = ({ onRecipeImported }) => {
  const { aiActionsRemaining, setAiActionsRemaining } = useAuth();
  const [url, setUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);
  const { showToast } = useToast();

  const handleClose = () => {
    setIsExpanded(false);
    setUrl("");
  };

  const handleUrlSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;

    setIsLoading(true);

    try {
      const response = await scrapeRecipe(url);
      if (aiActionsRemaining === 10) {
        showToast(`You are running low on AI actions for today`, "warning");
      }
      if (aiActionsRemaining <= 0) {
        showToast(
          "You've reached your daily AI action limit. Try another method.",
          "error"
        );
        setIsLoading(false);
        return;
      }
      onRecipeImported(response.data.recipe);
      showToast("Recipe imported successfully", "success");
      const actionsRemaining = aiActionsRemaining - 1;
      setAiActionsRemaining(actionsRemaining);
      handleClose();
    } catch (error) {
      showToast(
        "Error importing recipe. Please check the URL and try again.",
        "error"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleImageProcessing = async (imageData: string) => {
    try {
      const response = await extractRecipeFromImage(imageData);
      if (aiActionsRemaining === 10) {
        showToast(`You are running low on AI actions for today`, "warning");
      }
      if (aiActionsRemaining < 1) {
        showToast(
          "You've reached your daily AI action limit. Try another method.",
          "error"
        );
        return;
      }
      onRecipeImported(response.data.recipe);
      const remainingActions = aiActionsRemaining - 1;
      setAiActionsRemaining(remainingActions);
    } catch (error) {
      throw error;
    }
  };

  return (
    <div className="recipe-import-container">
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
        DISCLAIMER: Please review recipes from web and photo imports before
        saving as minor adjustments may be needed.
      </div>
      <div className="import-method-toggle">
        {isExpanded ? (
          <button
            type="button"
            onClick={handleClose}
            className="toggle-import-button active"
            style={{ marginBottom: 20 }}>
            <FaArrowLeft className="button-icon" />
          </button>
        ) : (
          <>
            <button
              type="button"
              onClick={() => {
                setIsExpanded(true);
              }}
              className="toggle-import-button">
              <FaLink />
              Upload from URL
            </button>
            <button
              type="button"
              onClick={() => setIsPhotoModalOpen(true)}
              className="toggle-import-button"
              style={{ marginLeft: 12 }}>
              <FaCamera />
              Take Photo
            </button>
          </>
        )}
      </div>

      {isExpanded && (
        <form onSubmit={handleUrlSubmit} className="url-import-form">
          <div className="url-input-wrapper">
            <FaLink className="url-icon" />
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="Paste recipe URL here..."
              className="url-input"
              disabled={isLoading}
            />
          </div>
          <br />
          <button
            type="submit"
            className="import-button"
            disabled={isLoading || !url.trim()}>
            {isLoading ? (
              <div>
                <AnimatedTechIcon size={20} speed={4} />
              </div>
            ) : (
              "Import"
            )}
          </button>
        </form>
      )}

      <PhotoCaptureModal
        isOpen={isPhotoModalOpen}
        onClose={() => setIsPhotoModalOpen(false)}
        apiFunction={handleImageProcessing} // Same function for both photo and upload
      />
    </div>
  );
};

export default RecipeImport;
