function cleanAIResponse(response) {
  // Initialize the structured recipe object
  const recipe = {
    title: "",
    prepTime: "",
    cookTime: "",
    servings: "",
    ingredients: [],
    instructions: [],
    nutritionalInfo: [],
    mealType: "",
  };

  // Split the response into lines and remove empty lines
  const lines = response.split("\n").filter((line) => line.trim());

  let currentSection = null;

  // Helper function to clean measurement text
  const cleanMeasurement = (text) => {
    return text
      .replace(/^[-•*]\s+/, "") // Remove bullet points
      .replace(/^\d+[\.)]\s*/, "") // Remove numbers
      .trim();
  };

  // First pass - get title and metadata
  for (let line of lines) {
    line = line.trim();

    // Skip empty lines
    if (!line) continue;

    // Extract recipe title (could be multiple formats)
    if (
      !recipe.title &&
      !line.toLowerCase().includes("prep time") &&
      !line.toLowerCase().includes("cook time") &&
      !line.toLowerCase().includes("servings")
    ) {
      console.log(line);
      recipe.title = line
        .replace(/Name:?/i, "")
        .replace(/:/g, "")
        .trim();
      continue;
    }

    // Extract prep time
    if (line.toLowerCase().includes("prep time")) {
      recipe.prepTime = line.split(":")[1]?.trim() || "";
      continue;
    }

    // Extract cook time
    if (line.toLowerCase().includes("cook time")) {
      recipe.cookTime = line.split(":")[1]?.trim() || "";
      continue;
    }

    // Extract servings
    if (line.toLowerCase().includes("servings")) {
      recipe.servings = line.split(":")[1]?.trim() || "";
      continue;
    }
  }

  // Second pass - get ingredients, instructions, and nutritional info
  currentSection = null;
  for (let line of lines) {
    line = line.trim();

    // Skip empty lines
    if (!line) continue;

    // Detect sections
    if (line.toLowerCase().includes("ingredients:")) {
      currentSection = "ingredients";
      continue;
    } else if (line.toLowerCase().includes("instructions:")) {
      currentSection = "instructions";
      continue;
    } else if (
      line.toLowerCase().includes("nutritional") ||
      line.toLowerCase().includes("nutrition")
    ) {
      currentSection = "nutritionalInfo";
      continue;
    }

    // Skip lines that we already processed in the first pass
    if (
      line.toLowerCase().includes("prep time") ||
      line.toLowerCase().includes("cook time") ||
      line.toLowerCase().includes("servings") ||
      line === recipe.title
    ) {
      continue;
    }

    // Process line based on current section
    if (currentSection) {
      const cleanedLine = cleanMeasurement(line);

      // Skip empty lines after cleaning
      if (!cleanedLine) continue;

      // Special handling for nutritional information
      if (currentSection === "nutritionalInfo") {
        // Only add if it looks like nutritional information
        if (
          cleanedLine.match(/\d+\s*(?:g|mg|kcal|calories|carbs?|protein|fat)/i)
        ) {
          recipe.nutritionalInfo.push(cleanedLine);
        }
      }
      // For ingredients, only add if it has measurements or common ingredient words
      else if (currentSection === "ingredients") {
        if (
          cleanedLine.match(
            /\d+|cup|tablespoon|teaspoon|pound|ounce|gram|ml|g|tsp|tbsp|oz|lb|piece|slice/i
          )
        ) {
          recipe.ingredients.push(cleanedLine);
        }
      }
      // For instructions, only add if it looks like an instruction (not nutritional info)
      else if (currentSection === "instructions") {
        if (
          !cleanedLine.match(/\d+\s*(?:g|mg|kcal|calories|carbs?|protein|fat)/i)
        ) {
          recipe.instructions.push(cleanedLine);
        }
      }
    }
  }

  // Clean up any stray asterisks or formatting
  recipe.title = recipe.title.replace(/\*+/g, "").trim();
  recipe.prepTime = recipe.prepTime.replace(/\*+/g, "").trim();
  recipe.cookTime = recipe.cookTime.replace(/\*+/g, "").trim();
  recipe.servings = recipe.servings.replace(/\*+/g, "").trim();

  return recipe;
}

module.exports = cleanAIResponse;
