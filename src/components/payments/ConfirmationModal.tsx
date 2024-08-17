import React from "react";
import { FaExclamationTriangle } from "react-icons/fa";

interface ConfirmationModalProps {
  message: string;
  additionalInfo?: string;
  onClose: () => void;
  onConfirm: () => void;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  message,
  additionalInfo,
  onClose,
  onConfirm,
}) => {
  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 1000,
      }}>
      <div
        style={{
          background: "var(--surface-color)",
          borderRadius: "15px",
          padding: "30px",
          maxWidth: "400px",
          width: "90%",
          boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
        }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            marginBottom: "20px",
          }}>
          <FaExclamationTriangle
            style={{
              color: "var(--secondary-color)",
              marginRight: "10px",
              fontSize: "24px",
            }}
          />
          <h2 style={{ color: "var(--primary-color)", margin: 0 }}>
            Confirm Action
          </h2>
        </div>
        <p style={{ marginBottom: "15px", color: "var(--text-color)" }}>
          {message}
        </p>
        {additionalInfo && (
          <p
            style={{
              marginBottom: "20px",
              color: "var(--text-color)",
              fontSize: "0.9em",
              fontStyle: "italic",
            }}>
            {additionalInfo}
          </p>
        )}
        <div
          style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
          <button
            onClick={onClose}
            style={{
              padding: "10px 20px",
              borderRadius: "5px",
              border: "none",
              backgroundColor: "var(--surface-color)",
              color: "var(--text-color)",
              cursor: "pointer",
            }}>
            Cancel
          </button>
          <button
            onClick={onConfirm}
            style={{
              padding: "10px 20px",
              borderRadius: "5px",
              border: "none",
              backgroundColor: "var(--primary-color)",
              color: "white",
              cursor: "pointer",
            }}>
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationModal;
