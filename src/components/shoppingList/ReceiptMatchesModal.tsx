import React, { useState } from "react";
import { FaCheckSquare, FaRegSquare } from "react-icons/fa";
import AnimatedTechIcon from "../common/AnimatedTechIcon";
import decimalHelper from "../../helpers/decimalHelper";

interface MatchedItem {
  shopping_list_id: number;
  shopping_list_item: string;
  receipt_match: string;
  quantity: number;
  unit: string;
}

interface ReceiptMatchesModalProps {
  matches: MatchedItem[];
  onClose: () => void;
  onAddToInventory: (items: MatchedItem[]) => Promise<void>;
}

const ReceiptMatchesModal: React.FC<ReceiptMatchesModalProps> = ({
  matches,
  onClose,
  onAddToInventory,
}) => {
  const [selectedItems, setSelectedItems] = useState<Set<number>>(
    new Set(matches.map((m) => m.shopping_list_id))
  );
  const [isProcessing, setIsProcessing] = useState(false);
  const [quantities, setQuantities] = useState<{ [key: number]: number }>(
    Object.fromEntries(
      matches.map((match) => [match.shopping_list_id, match.quantity])
    )
  );

  const toggleItem = (id: number) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedItems(newSelected);
  };

  const handleAddToInventory = async () => {
    setIsProcessing(true);
    try {
      const selectedMatches = matches
        .filter((match) => selectedItems.has(match.shopping_list_id))
        .map((match) => ({
          ...match,
          quantity: quantities[match.shopping_list_id],
        }));
      await onAddToInventory(selectedMatches);
      onClose();
    } catch (error) {
      console.error("Error adding items to inventory:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h2>Found Items</h2>
          <p>
            The following items from your shopping list were found on the
            receipt:
          </p>
        </div>

        <div className="matches-table">
          <div className="matches-header">
            <div className="matches-item">Item</div>
            <div className="matches-qty">Quantity</div>
            <div className="matches-check"></div>
          </div>

          {matches.map((match) => (
            <div key={match.shopping_list_id} className="matches-row">
              <div
                className="matches-item"
                onClick={() => toggleItem(match.shopping_list_id)}>
                {match.shopping_list_item}
              </div>
              <div className="matches-qty-input">
                <input
                  type="text"
                  value={quantities[match.shopping_list_id]}
                  onChange={(e) =>
                    decimalHelper(
                      (value: any) =>
                        setQuantities((prev) => ({
                          ...prev,
                          [match.shopping_list_id]: value,
                        })),
                      e
                    )
                  }
                  className="quantity-input"
                  min="0"
                  step="1"
                  placeholder="Enter quantity"
                />
                <span className="unit-label">{match.unit}</span>
              </div>
              <div
                className="matches-check"
                onClick={() => toggleItem(match.shopping_list_id)}>
                {selectedItems.has(match.shopping_list_id) ? (
                  <FaCheckSquare className="check-icon" />
                ) : (
                  <FaRegSquare className="check-icon" />
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="modal-footer">
          <button
            onClick={onClose}
            className="button-cancel"
            disabled={isProcessing}>
            Cancel
          </button>
          <button
            onClick={handleAddToInventory}
            className="button-add"
            disabled={isProcessing || selectedItems.size === 0}>
            {isProcessing ? (
              <div className="button-content">
                <AnimatedTechIcon size={20} speed={4} />
                <span>Processing...</span>
              </div>
            ) : (
              `Add ${selectedItems.size} ${
                selectedItems.size === 1 ? "Item" : "Items"
              } to Inventory`
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReceiptMatchesModal;
