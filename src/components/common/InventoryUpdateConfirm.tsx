import React from "react";
import { FaBoxOpen } from "react-icons/fa";

interface InventoryUpdateConfirmModalProps {
  isOpen: boolean;
  onStartCooking: () => void;
}

const InventoryUpdateConfirmModal: React.FC<
  InventoryUpdateConfirmModalProps
> = ({ isOpen, onStartCooking }) => {
  if (!isOpen) return null;

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
        }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            marginBottom: "20px",
          }}>
          <FaBoxOpen
            style={{
              color: "var(--primary-color)",
              marginRight: "10px",
              fontSize: "24px",
            }}
          />
          <h2 style={{ color: "var(--primary-color)", margin: 0 }}>
            Inventory Updated
          </h2>
        </div>

        <div
          style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
          <button
            onClick={onStartCooking}
            style={{
              padding: "10px 20px",
              borderRadius: "5px",
              border: "none",
              backgroundColor: "var(--primary-color)",
              color: "white",
              cursor: "pointer",
            }}>
            Start Cooking
          </button>
        </div>
      </div>
    </div>
  );
};

export default InventoryUpdateConfirmModal;
