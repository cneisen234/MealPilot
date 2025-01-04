import React, { useState, useRef } from "react";
import { FaLink, FaCamera, FaImage } from "react-icons/fa";
import { scrapeRecipe, extractRecipeFromImage } from "../../utils/api";
import AnimatedTechIcon from "../common/AnimatedTechIcon";

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

type ImportMethod = "url" | "image";

const MAX_IMAGE_SIZE = 500; // Maximum width/height in pixels

const resizeImage = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.src = URL.createObjectURL(file);

    img.onload = () => {
      const canvas = document.createElement("canvas");
      let width = img.width;
      let height = img.height;

      // Calculate new dimensions while maintaining aspect ratio
      if (width > height) {
        if (width > MAX_IMAGE_SIZE) {
          height *= MAX_IMAGE_SIZE / width;
          width = MAX_IMAGE_SIZE;
        }
      } else {
        if (height > MAX_IMAGE_SIZE) {
          width *= MAX_IMAGE_SIZE / height;
          height = MAX_IMAGE_SIZE;
        }
      }

      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");
      ctx?.drawImage(img, 0, 0, width, height);

      // Convert to base64
      const dataUrl = canvas.toDataURL("image/jpeg", 0.8);
      URL.revokeObjectURL(img.src); // Clean up
      resolve(dataUrl);
    };

    img.onerror = () => {
      URL.revokeObjectURL(img.src);
      reject(new Error("Failed to load image"));
    };
  });
};

const RecipeImport: React.FC<RecipeImportProps> = ({
  onRecipeImported,
  onError,
}) => {
  const [url, setUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [importMethod, setImportMethod] = useState<ImportMethod>("url");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleClose = () => {
    setIsExpanded(false);
    setUrl(""); // Clear URL
    setSelectedImage(null); // Clear selected image
    if (fileInputRef.current) {
      fileInputRef.current.value = ""; // Reset file input
    }
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

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      onError("Image size must be less than 5MB");
      return;
    }

    try {
      const resizedImage = await resizeImage(file);
      setSelectedImage(resizedImage);

      setIsLoading(true);
      const response = await extractRecipeFromImage(resizedImage);
      onRecipeImported(response.data.recipe);
      handleClose();
    } catch (error) {
      onError(
        "Failed to extract recipe from image. Please try again or enter recipe details manually."
      );
      console.error("Error extracting recipe:", error);
    } finally {
      setIsLoading(false);
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
                setImportMethod("url");
              }}
              className="toggle-import-button">
              <FaLink />
              Import from URL
            </button>
            <button
              type="button"
              onClick={() => {
                setIsExpanded(true);
                setImportMethod("image");
              }}
              className="toggle-import-button">
              <FaCamera />
              Import from Image
            </button>
          </>
        )}
      </div>

      {isExpanded && (
        <div>
          {importMethod === "url" ? (
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
          ) : (
            <div className="image-input-section">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleImageSelect}
                accept="image/*"
                className="hidden"
              />

              {selectedImage ? (
                <div className="selected-image-container">
                  <img
                    src={selectedImage}
                    alt="Selected recipe"
                    className="selected-image"
                    style={{
                      maxWidth: "100%",
                      maxHeight: `${MAX_IMAGE_SIZE}px`,
                    }}
                  />
                  {isLoading && (
                    <div className="loading-overlay">
                      <AnimatedTechIcon size={40} speed={4} />
                      <p>Extracting Recipe...</p>
                    </div>
                  )}
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="image-upload-button"
                  disabled={isLoading}>
                  <FaImage size={24} />
                  <span>Click to upload recipe image</span>
                  <span className="upload-hint">
                    Supports JPG, PNG • Max 5MB
                  </span>
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default RecipeImport;
