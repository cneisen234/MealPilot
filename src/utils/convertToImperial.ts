interface ConvertedQuantity {
  value: number;
  unit: string;
}

export const convertToImperial = (
  quantity: number,
  unit: string,
  system: any
): ConvertedQuantity => {
  if (system === 'metric') {
  switch (unit.toLowerCase()) {
     case 'pounds':
      return {
        value: Number((quantity / 2.20462).toFixed(2)),
        unit: 'kilograms'
      };
    case 'cups':
      return {
        value: Number((quantity / 4.22675).toFixed(2)),
        unit: 'liters'
      };
    default:
      return { value: quantity, unit };
    }
  } else {

  // Handle imperial conversions
  switch (unit.toLowerCase()) {
    case 'kilograms':
      return {
        value: Number((quantity * 2.20462).toFixed(2)),
        unit: 'pounds'
      };
    case 'liters':
      return {
        value: Number((quantity * 4.22675).toFixed(2)),
        unit: 'cups'
      };
    default:
      return { value: quantity, unit }; // For units, keep as is
    }
  }
};