import React from "react";
import { FaEye, FaEyeSlash } from "react-icons/fa";

export const InputWithPasswordToggle: React.FC<{
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  showPassword: boolean;
  onToggle: () => void;
}> = ({ value, onChange, showPassword, onToggle }) => {
  return (
    <div style={{ position: "relative" }}>
      <input
        type={showPassword ? "text" : "password"}
        className="form-control"
        placeholder="Password"
        value={value}
        onChange={onChange}
        required
        style={{ paddingRight: "5px", width: "93%" }}
      />
      <button
        type="button"
        onClick={onToggle}
        style={{
          position: "absolute",
          right: "12px",
          top: "50%",
          transform: "translateY(-50%)",
          background: "none",
          border: "none",
          cursor: "pointer",
          padding: "4px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--text-color)",
          opacity: 0.7,
          transition: "opacity 0.2s ease",
        }}
        onMouseOver={(e) => (e.currentTarget.style.opacity = "1")}
        onMouseOut={(e) => (e.currentTarget.style.opacity = "0.7")}>
        {showPassword ? <FaEye size={20} /> : <FaEyeSlash size={20} />}
      </button>
    </div>
  );
};
