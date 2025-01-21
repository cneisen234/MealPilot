export interface SortConfig {
  field: string;
  direction: "asc" | "desc";
  type: "string" | "number" | "date";
}

export const sortHelper = <T extends Record<string, any>>(
  data: T[],
  config: SortConfig
): T[] => {
  const { field, direction, type } = config;

  return [...data].sort((a, b) => {
    let valueA = a[field];
    let valueB = b[field];

    // Handle null/undefined values
    if (valueA == null) return direction === "asc" ? -1 : 1;
    if (valueB == null) return direction === "asc" ? 1 : -1;

    // Convert values based on type
    switch (type) {
      case "date":
        valueA = new Date(valueA).getTime();
        valueB = new Date(valueB).getTime();
        break;
      case "number":
        valueA = Number(valueA);
        valueB = Number(valueB);
        break;
      case "string":
        valueA = String(valueA).toLowerCase();
        valueB = String(valueB).toLowerCase();
        break;
    }

    if (valueA < valueB) return direction === "asc" ? -1 : 1;
    if (valueA > valueB) return direction === "asc" ? 1 : -1;
    return 0;
  });
};
