import React, { useState } from "react";
import { FaLink, FaCamera } from "react-icons/fa";
import { extractRecipeFromImage, scrapeRecipe } from "../../utils/api";
import AnimatedTechIcon from "../common/AnimatedTechIcon";
import PhotoCaptureModal from "../common/PhotoCaptureComponent";

interface RecipeImportProps {
  onRecipeImported: (recipe: {
    title: string;
    prepTime: string;
    cookTime: string;
    servings: string;
    ingredients: string[];
    instructions: string[];
    nutritionalInfo: string[];
  }) => void;
  onError: (error: string) => void;
}

const RecipeImport: React.FC<RecipeImportProps> = ({
  onRecipeImported,
  onError,
}) => {
  const [url, setUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);

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
      onRecipeImported(response.data.recipe);
      handleClose();
    } catch (error) {
      onError("Failed to import recipe. Please check the URL and try again.");
      console.error("Error importing recipe:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      onError("Image size must be less than 5MB");
      return;
    }

    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const imageData = e.target?.result as string;
        setIsLoading(true);
        const response = await extractRecipeFromImage(imageData);
        onRecipeImported(response.data.recipe);
        handleClose();
      };
      reader.readAsDataURL(file);
    } catch (error) {
      onError(
        "Failed to extract recipe from image. Please try again or enter recipe details manually."
      );
      console.error("Error extracting recipe:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePhotoCapture = async (imageData: string) => {
    try {
      const response = await extractRecipeFromImage(imageData);
      onRecipeImported(response.data.recipe);
    } catch (error) {
      throw error; // Let the PhotoCaptureModal handle the error
    }
  };

  return (
    <div className="recipe-import-container">
      <div className="import-method-toggle">
        {isExpanded ? (
          <button
            type="button"
            onClick={handleClose}
            className="toggle-import-button active">
            Close
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
              Import from URL
            </button>
            <button
              type="button"
              onClick={() => setIsPhotoModalOpen(true)}
              className="toggle-import-button">
              <FaCamera />
              Take or Upload Photo
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
          </div>
        </form>
      )}

      <PhotoCaptureModal
        isOpen={isPhotoModalOpen}
        onClose={() => setIsPhotoModalOpen(false)}
        uploadFunction={handleFileUpload}
        apiFunction={handlePhotoCapture}
      />
    </div>
  );
};

export default RecipeImport;
