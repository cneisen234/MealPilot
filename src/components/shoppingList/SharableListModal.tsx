import React, { useState, useEffect } from "react";
import { FaLink, FaCopy, FaCheck } from "react-icons/fa";
import { createSharedList, incrementAchievement } from "../../utils/api";
import { useToast } from "../../context/ToastContext";
import AnimatedTechIcon from "../common/AnimatedTechIcon";

interface ShareableListModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: any[];
  setIsLoading?: any;
}

const ShareableListModal: React.FC<ShareableListModalProps> = ({
  isOpen,
  onClose,
  items,
  setIsLoading,
}) => {
  const { showToast } = useToast();
  const [shareableLink, setShareableLink] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const createList = async () => {
        try {
          const shareId = Math.random().toString(36).substring(2, 15);
          const baseUrl = window.location.origin;
          await createSharedList(
            items.filter((item) => item.isSelected),
            shareId
          );
          const result = await incrementAchievement("lists_shared");
          if (result.toast) {
            showToast(result.toast.message, "info");
          }
          setShareableLink(`${baseUrl}/share/shopping-list/${shareId}`);
        } catch (error) {
          console.error("Error creating shared list:", error);
        } finally {
          setIsLoading(false);
        }
      };

      createList();
    } else {
      setCopied(false);
    }
  }, [isOpen, items]);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareableLink);
      setCopied(true);
      showToast("Link copied to clipboard", "success");
      onClose();
    } catch (error) {
      showToast("Error copying link", "error");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        {!shareableLink ? (
          <div className="loading-container">
            <AnimatedTechIcon size={100} speed={4} />
          </div>
        ) : (
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
                style={{ float: "right" }}
                className="link-input"
              />
            </div>
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
        )}
      </div>
    </div>
  );
};

export default ShareableListModal;
