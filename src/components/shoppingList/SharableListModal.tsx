import React, { useState, useEffect } from "react";
import { FaLink, FaCopy, FaCheck } from "react-icons/fa";
import { createSharedList } from "../../utils/api";
import ShareableList from "./SharableList";

interface ShareableListModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: any[];
  onMoveToInventory?: (items: any[]) => Promise<void>;
}

const ShareableListModal: React.FC<ShareableListModalProps> = ({
  isOpen,
  onClose,
  items,
  onMoveToInventory,
}) => {
  const [shareableLink, setShareableLink] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const createList = async () => {
        try {
          const shareId = Math.random().toString(36).substring(2, 15);
          const baseUrl = window.location.origin;
          setShareableLink(`${baseUrl}/share/shopping-list/${shareId}`);
          await createSharedList(
            items.filter((item) => item.isSelected),
            shareId
          );
        } catch (error) {
          console.error("Error creating shared list:", error);
        }
      };

      createList();
    }
  }, [isOpen, items]);

  console.log(shareableLink);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareableLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy link:", error);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <div className="modal-title">
            <h2>Shareable Shopping List</h2>
            <button onClick={onClose} className="close-button">
              ×
            </button>
          </div>

          <div className="share-link-section">
            <FaLink className="link-icon" />
            <input
              type="text"
              value={shareableLink}
              readOnly
              className="link-input"
            />
            <button
              onClick={handleCopyLink}
              className={`copy-button ${copied ? "copied" : ""}`}>
              {copied ? (
                <>
                  <FaCheck /> <span>Copied!</span>
                </>
              ) : (
                <>
                  <FaCopy /> <span>Copy Link</span>
                </>
              )}
            </button>
          </div>

          <ShareableList items={items} onMoveToInventory={onMoveToInventory} />
        </div>
      </div>
    </div>
  );
};

export default ShareableListModal;
