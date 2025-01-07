import React from "react";
import { FaExclamationTriangle } from "react-icons/fa";

interface ExpirationAlertProps {
  items: Array<{
    item_name: string;
    expiration_date: string;
    quantity: number;
  }>;
  onClose: () => void;
}

const ExpirationAlert: React.FC<ExpirationAlertProps> = ({
  items,
  onClose,
}) => {
  if (items.length === 0) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <div className="alert-title">
            <FaExclamationTriangle size={24} color="#dc3545" />
            <h2>Items Expiring Soon</h2>
          </div>
        </div>

        <div className="expiring-items-list">
          {items.map((item, index) => (
            <div key={index} className="expiring-item">
              <p>
                <strong>{item.item_name}</strong> - {item.quantity}
              </p>
              <p className="expiration-date">
                Expires: {new Date(item.expiration_date).toLocaleDateString()}
              </p>
            </div>
          ))}
        </div>

        <div className="modal-footer">
          <button onClick={onClose} className="submit-button">
            Okay
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExpirationAlert;
