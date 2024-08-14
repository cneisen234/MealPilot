import React from "react";

interface ConfirmationModalProps {
  message: string;
  onClose: () => void;
  onConfirm: () => void;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  message,
  onClose,
  onConfirm,
}) => {
  return (
    <div className="modal">
      <h2>Confirm Action</h2>
      <p>{message}</p>
      <p>
        Note: Downgrading may result in the loss of some of your interest list
        and friends list.
      </p>
      <button onClick={onConfirm}>Confirm</button>
      <button onClick={onClose}>Cancel</button>
    </div>
  );
};

export default ConfirmationModal;
