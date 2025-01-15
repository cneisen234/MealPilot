import React, { useEffect } from "react";
import { FaMinus, FaPlus } from "react-icons/fa";
import decimalHelper from "../../helpers/decimalHelper";

interface QtyInputProps {
  value: number | string;
  onChange: (value: number) => void;
  label?: string;
  error?: string;
  id?: string;
  min?: number;
  max?: number;
  placeholder?: string;
  className?: string;
}

const QtyInput: React.FC<QtyInputProps> = ({
  value,
  onChange,
  label = "Quantity",
  error,
  id = "quantity",
  min = 0,
  max,
  placeholder = "Enter quantity",
  className = "",
}) => {
  useEffect(() => {
    if (Number(value) < 0) {
      onChange(0);
    }
  }, [value]);

  const numericValue =
    typeof value === "string" ? parseFloat(value) || 0 : value;

  const handleIncrement = () => {
    if (max !== undefined && numericValue >= max) return;
    const newValue = Number(numericValue) + 1;
    onChange(Number(newValue.toFixed(2)));
  };

  const handleDecrement = () => {
    if (numericValue <= min) return;
    const newValue = Number(numericValue) - 1;
    onChange(Number(newValue.toFixed(2)));
  };

  const buttonStyles = (
    isRight: boolean,
    disabled: boolean
  ): React.CSSProperties => ({
    width: "32px",
    height: "100%",
    border: "2px solid #E0E0E0",
    borderLeft: isRight ? "none" : "2px solid #E0E0E0",
    borderRight: isRight ? "2px solid #E0E0E0" : "none",
    borderTop: "2px solid #E0E0E0",
    borderBottom: "2px solid #E0E0E0",
    borderRadius: isRight ? "0 6px 6px 0" : "6px 0 0 6px",
    backgroundColor: disabled ? "#E0E0E0" : "var(--primary-color)",
    color: disabled ? "#999" : "white",
    cursor: disabled ? "not-allowed" : "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 0,
    margin: 0,
    transition: "all 0.2s ease",
  });

  const containerStyles: React.CSSProperties = {
    display: "flex",
    alignItems: "stretch",
    height: "38px",
    marginTop: "8px",
  };

  const inputStyles: React.CSSProperties = {
    width: "60px",
    textAlign: "center",
    padding: "8px 0",
    border: "2px solid #E0E0E0",
    borderLeft: "none",
    borderRight: "none",
    fontSize: "0.95rem",
    margin: 0,
    outline: "none",
  };

  const errorStyles: React.CSSProperties = {
    color: "#dc3545",
    fontSize: "0.875rem",
    marginTop: "6px",
  };

  const labelStyles: React.CSSProperties = {
    display: "block",
    marginBottom: "6px",
    color: "#4A5568",
    fontSize: "0.95rem",
    fontWeight: "500",
  };

  const groupStyles: React.CSSProperties = {
    marginBottom: "24px",
  };

  return (
    <div style={groupStyles}>
      {label && (
        <label htmlFor={id} style={labelStyles}>
          {label}
        </label>
      )}

      <div style={containerStyles}>
        <button
          type="button"
          onClick={handleDecrement}
          disabled={numericValue <= min}
          style={buttonStyles(false, numericValue <= min)}
          aria-label="Decrease quantity">
          <FaMinus size={12} />
        </button>

        <input
          type="text"
          id={id}
          value={value}
          onChange={(e) => decimalHelper(onChange, e)}
          style={inputStyles}
          className={className}
          min={min}
          max={max}
          placeholder={placeholder}
          aria-label="Quantity input"
        />

        <button
          type="button"
          onClick={handleIncrement}
          disabled={max !== undefined && numericValue >= max}
          style={buttonStyles(true, max !== undefined && numericValue >= max)}
          aria-label="Increase quantity">
          <FaPlus size={12} />
        </button>
      </div>
    </div>
  );
};

export default QtyInput;
