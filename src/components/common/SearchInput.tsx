import React, { useState, useEffect, useCallback } from "react";
import { FaSearch, FaTimes } from "react-icons/fa";

interface SearchableItem {
  id: number | string;
  name: string;
  [key: string]: any;
}

interface SearchInputProps<T extends SearchableItem> {
  items: T[];
  onSearch: (filteredItems: T[]) => void;
  placeholder?: string;
  className?: string;
}

const SearchInput = <T extends SearchableItem>({
  items,
  onSearch,
  placeholder = "Search items...",
  className = "",
}: SearchInputProps<T>) => {
  const [searchTerm, setSearchTerm] = useState("");

  const filterItems = useCallback(() => {
    if (searchTerm.length >= 2) {
      const filtered = items.filter((item) =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
      onSearch(filtered);
    } else {
      onSearch(items);
    }
  }, [searchTerm, items, onSearch]);

  useEffect(() => {
    filterItems();
  }, [searchTerm]);

  const searchContainerStyles: React.CSSProperties = {
    position: "relative",
    width: "92%",
    marginBottom: "20px",
  };

  const searchIconStyles: React.CSSProperties = {
    position: "absolute",
    left: "12px",
    top: "50%",
    transform: "translateY(-50%)",
    color: "var(--text-color)",
    opacity: 0.5,
    pointerEvents: "none",
  };

  const inputStyles: React.CSSProperties = {
    width: "80%",
    padding: "12px 40px",
    border: "2px solid #E0E0E0",
    borderRadius: "8px",
    fontSize: "1rem",
    outline: "none",
    transition: "all 0.2s ease",
  };

  return (
    <div style={searchContainerStyles} className={className}>
      <FaSearch style={searchIconStyles} size={16} />

      <input
        type="text"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        placeholder={placeholder}
        style={inputStyles}
      />
    </div>
  );
};

export default SearchInput;
