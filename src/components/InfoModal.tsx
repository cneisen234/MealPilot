import React from "react";
import { FaInfoCircle } from "react-icons/fa";

interface InfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  message: string;
}

const InfoModal: React.FC<InfoModalProps> = ({ isOpen, onClose, message }) => {
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
          <FaInfoCircle
            style={{
              color: "var(--primary-color)",
              marginRight: "10px",
              fontSize: "24px",
            }}
          />
          <h2 style={{ color: "var(--primary-color)", margin: 0 }}>
            Information
          </h2>
        </div>
        <p style={{ marginBottom: "20px" }}>{message}</p>
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button
            onClick={onClose}
            style={{
              padding: "10px 20px",
              borderRadius: "5px",
              border: "none",
              backgroundColor: "var(--primary-color)",
              color: "white",
              cursor: "pointer",
            }}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default InfoModal;
