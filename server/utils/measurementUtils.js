// server/utils/measurementUtils.js

const BaseUnit = {
  KILOGRAMS: "kilograms",
  LITERS: "liters",
  UNITS: "units",
};

const unitDefinitions = {
  // Mass measurements (all convert to kilograms)
  mg: {
    category: "mass",
    toBase: 0.000001,
    alternateNames: ["milligram", "milligrams", "mgs"],
  },
  g: {
    category: "mass",
    toBase: 0.001,
    alternateNames: ["gram", "grams", "gs", "gr", "gm", "gms"],
  },
  kilogram: {
    category: "mass",
    toBase: 1,
    alternateNames: ["kg", "kgs", "kilo", "kilos", "kilograms"],
  },
  oz: {
    category: "mass",
    toBase: 0.0283495,
    alternateNames: ["ounce", "ounces", "ozs"],
  },
  lb: {
    category: "mass",
    toBase: 0.453592,
    alternateNames: ["pound", "pounds", "lbs", "#"],
  },

  // Volume measurements (all convert to liters)
  ml: {
    category: "volume",
    toBase: 0.001,
    alternateNames: [
      "milliliter",
      "milliliters",
      "millilitre",
      "millilitres",
      "mls",
      "cc",
    ],
  },
  liter: {
    category: "volume",
    toBase: 1,
    alternateNames: ["l", "ls", "liters", "litre", "litres"],
  },
  tsp: {
    category: "volume",
    toBase: 0.00492892,
    alternateNames: ["teaspoon", "teaspoons", "tsps", "t"],
  },
  tbsp: {
    category: "volume",
    toBase: 0.0147868,
    alternateNames: ["tablespoon", "tablespoons", "tbsps", "T"],
  },
  cup: {
    category: "volume",
    toBase: 0.236588,
    alternateNames: ["cups", "c"],
  },
  pt: {
    category: "volume",
    toBase: 0.473176,
    alternateNames: ["pint", "pints", "pts"],
  },
  qt: {
    category: "volume",
    toBase: 0.946353,
    alternateNames: ["quart", "quarts", "qts"],
  },
  gal: {
    category: "volume",
    toBase: 3.78541,
    alternateNames: ["gallon", "gallons", "gals"],
  },

  // Units/Count measurements
  units: {
    category: "units",
    toBase: 1,
    alternateNames: [
      "unit",
      "piece",
      "pieces",
      "pc",
      "pcs",
      "each",
      "ea",
      "count",
      "ct",
      "whole",
      "slice",
      "slices",
      "portion",
      "portions",
      "serving",
      "servings",
    ],
  },
};

// Create map of all possible unit names
const unitNameMap = new Map();
Object.entries(unitDefinitions).forEach(([baseUnit, definition]) => {
  unitNameMap.set(baseUnit.toLowerCase(), baseUnit);
  definition.alternateNames.forEach((name) => {
    unitNameMap.set(name.toLowerCase(), baseUnit);
  });
});

const parseQuantity = (value) => {
  if (typeof value === "number") return value;

  // Clean the input string
  const cleanValue = value.toString().trim();

  // Handle mixed numbers (e.g., "1 1/2")
  const mixedMatch = cleanValue.match(/^(\d+)\s+(\d+)\/(\d+)$/);
  if (mixedMatch) {
    const [, whole, numerator, denominator] = mixedMatch;
    return parseInt(whole) + parseInt(numerator) / parseInt(denominator);
  }

  // Handle simple fractions (e.g., "1/2")
  const fractionMatch = cleanValue.match(/^(\d+)\/(\d+)$/);
  if (fractionMatch) {
    const [, numerator, denominator] = fractionMatch;
    return parseInt(numerator) / parseInt(denominator);
  }

  // Handle decimal numbers
  return parseFloat(cleanValue);
};

const standardizeUnit = (unit) => {
  if (!unit) return null;
  const cleanUnit = unit.toString().toLowerCase().trim();
  return unitNameMap.get(cleanUnit) || null;
};

const convertToStandardUnit = (quantity, unit) => {
  const standardUnit = standardizeUnit(unit);
  if (!standardUnit) {
    throw new Error(`Unknown unit: ${unit}`);
  }

  const definition = unitDefinitions[standardUnit];
  if (!definition) {
    throw new Error(`No definition found for unit: ${standardUnit}`);
  }

  const parsedQuantity = parseQuantity(quantity);
  if (isNaN(parsedQuantity)) {
    throw new Error(`Invalid quantity: ${quantity}`);
  }

  const value = parsedQuantity * definition.toBase;

  // Map category to base unit
  let baseUnit;
  switch (definition.category) {
    case "mass":
      baseUnit = BaseUnit.KILOGRAMS;
      break;
    case "volume":
      baseUnit = BaseUnit.LITERS;
      break;
    case "units":
      baseUnit = BaseUnit.UNITS;
      break;
    default:
      throw new Error(`Invalid measurement category: ${definition.category}`);
  }

  return {
    value: Number(value.toFixed(2)),
    unit: baseUnit,
  };
};

module.exports = {
  BaseUnit,
  convertToStandardUnit,
  standardizeUnit,
};
