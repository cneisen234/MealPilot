// src/components/common/Toast/Toast.tsx
import React from "react";
import {
  FaTimes,
  FaCheck,
  FaExclamationTriangle,
  FaInfo,
} from "react-icons/fa";
import { useToast } from "../../context/ToastContext";
import "../../styles/toast.css";

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useToast();

  const getIcon = (type: string) => {
    switch (type) {
      case "success":
        return <FaCheck />;
      case "error":
        return <FaExclamationTriangle />;
      case "warning":
        return <FaExclamationTriangle />;
      case "info":
        return <FaInfo />;
      default:
        return null;
    }
  };

  return (
    <div className="toast-container">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`toast-item toast-${toast.type}`}
          role="alert"
          aria-live="assertive">
          <div className="toast-icon">{getIcon(toast.type)}</div>
          <div className="toast-content">{toast.message}</div>
          <button
            className="toast-close"
            onClick={() => removeToast(toast.id)}
            aria-label="Close">
            <FaTimes />
          </button>
        </div>
      ))}
    </div>
  );
};
