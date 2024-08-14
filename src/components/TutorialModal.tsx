import React from "react";
import "../styles/tutorialmodal.css"; // We'll create this CSS file

interface TutorialModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

const TutorialModal: React.FC<TutorialModalProps> = ({
  isOpen,
  onClose,
  children,
}) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <button className="modal-close" onClick={onClose}>
          &times;
        </button>
        {children}
      </div>
    </div>
  );
};

export default TutorialModal;
