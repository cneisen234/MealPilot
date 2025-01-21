import React, { useState, useCallback } from "react";
import { FaSort, FaSortUp, FaSortDown } from "react-icons/fa";
import "../../styles/sortinput.css";

interface SortOption {
  label: string;
  value: string;
  type: "string" | "number" | "date";
}

interface SortInputProps {
  options: SortOption[];
  onSort: (field: string, direction: "asc" | "desc") => void;
  className?: string;
  defaultSort?: {
    field: string;
    direction: "asc" | "desc";
  };
}

const SortInput: React.FC<SortInputProps> = ({
  options,
  onSort,
  className = "",
  defaultSort,
}) => {
  const [selectedField, setSelectedField] = useState(
    defaultSort?.field || options[0].value
  );
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">(
    defaultSort?.direction || "asc"
  );

  const handleSortChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const newField = e.target.value;
      setSelectedField(newField);
      onSort(newField, sortDirection);
    },
    [sortDirection, onSort]
  );

  const toggleSortDirection = useCallback(() => {
    const newDirection = sortDirection === "asc" ? "desc" : "asc";
    setSortDirection(newDirection);
    onSort(selectedField, newDirection);
  }, [selectedField, sortDirection, onSort]);

  const getSortIcon = () => {
    if (sortDirection === "asc") {
      return <FaSortUp className="sort-icon" />;
    }
    if (sortDirection === "desc") {
      return <FaSortDown className="sort-icon" />;
    }
    return <FaSort className="sort-icon" />;
  };

  return (
    <div className={`sort-input-container ${className}`}>
      <select
        value={selectedField}
        onChange={handleSortChange}
        className="sort-select">
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            Sort by {option.label}
          </option>
        ))}
      </select>

      <button
        onClick={toggleSortDirection}
        className="sort-direction-button"
        aria-label={`Sort ${
          sortDirection === "asc" ? "descending" : "ascending"
        }`}>
        {getSortIcon()}
      </button>
    </div>
  );
};

export default SortInput;
