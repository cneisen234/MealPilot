// Helper function to convert fractions to decimals
const convertFractionToDecimal = (fraction: string): number => {
  // If it's a mixed number (e.g., "1 1/2")
  if (fraction.includes(" ")) {
    const [whole, frac] = fraction.split(" ");
    const [num, denom] = frac.split("/");
    return parseInt(whole) + parseInt(num) / parseInt(denom);
  }
  // If it's a simple fraction (e.g., "1/2")
  if (fraction.includes("/")) {
    const [num, denom] = fraction.split("/");
    return parseInt(num) / parseInt(denom);
  }
  // If it's a whole number
  return parseFloat(fraction);
};

// Helper function to convert decimal back to fraction
const convertDecimalToFraction = (decimal: number): string => {
  // Handle whole numbers
  if (Math.floor(decimal) === decimal) {
    return decimal.toString();
  }

  // Handle mixed numbers
  const wholePart = Math.floor(decimal);
  const fractionalPart = decimal - wholePart;

  // Convert to fraction with denominator 2, 3, 4, 8, or 16
  const denominators = [2, 3, 4, 8, 16];
  let bestFraction = { diff: Infinity, num: 0, den: 1 };

  denominators.forEach((den) => {
    const num = Math.round(fractionalPart * den);
    const diff = Math.abs(fractionalPart - num / den);
    if (diff < bestFraction.diff) {
      bestFraction = { diff, num, den };
    }
  });

  // If there's a whole number part
  if (wholePart > 0) {
    return bestFraction.num === 0
      ? `${wholePart}`
      : `${wholePart} ${bestFraction.num}/${bestFraction.den}`;
  }

  // Just the fraction
  return `${bestFraction.num}/${bestFraction.den}`;
};

// Main function to scale ingredient quantities
export const scaleIngredients = (
  originalIngredient: string,
  originalServings: number,
  newServings: number
): string => {
  // Regular expression to match numbers (including fractions and decimals)
  const numberPattern = /(\d+\/\d+|\d+\s\d+\/\d+|\d*\.?\d+)/;

  const match = originalIngredient.match(numberPattern);
  if (!match) return originalIngredient;

  const originalQuantity = convertFractionToDecimal(match[0]);
  const scaleFactor = newServings / originalServings;
  const newQuantity = originalQuantity * scaleFactor;

  // Convert the new quantity to a fraction if needed
  const newQuantityStr = convertDecimalToFraction(
    Number(newQuantity.toFixed(2))
  );

  // Replace the original quantity with the new quantity
  return originalIngredient.replace(match[0], newQuantityStr);
};
