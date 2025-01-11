import React from "react";
import { FaTimes } from "react-icons/fa";

interface MatchSelectionModalProps {
  matches: Array<{
    id: number;
    item_name: string;
    quantity: number;
  }>;
  onSelect: (item: any) => void;
  onClose: () => void;
  onNoMatch: () => void;
}

const MatchSelectionModal: React.FC<MatchSelectionModalProps> = ({
  matches,
  onSelect,
  onClose,
  onNoMatch,
}) => {
  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header-form">
          <h2>Found Similar Items</h2>
          <button onClick={onClose} className="modal-close-btn">
            <FaTimes />
          </button>
        </div>

        <div className="matches-table">
          {matches.map((match) => (
            <div
              key={match.id}
              className="matches-row"
              onClick={() => onSelect(match)}
              style={{ cursor: "pointer" }}>
              <div className="matches-item">{match.item_name}</div>
              <div className="matches-qty">QTY: {match.quantity}</div>
            </div>
          ))}
        </div>

        <div className="modal-footer">
          <button onClick={() => onNoMatch()} className="button-cancel">
            None of these
          </button>
        </div>
      </div>
    </div>
  );
};

export default MatchSelectionModal;
