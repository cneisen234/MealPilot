import React, { useState } from "react";
import { FaTimes, FaSearch, FaUserPlus } from "react-icons/fa";
import { User, FriendRequest } from "../types";

interface AddFriendModalProps {
  onClose: () => void;
  currentUserId: number;
  onSendFriendRequest: (
    request: Omit<FriendRequest, "id" | "createdAt">
  ) => void;
}

const AddFriendModal: React.FC<AddFriendModalProps> = ({
  onClose,
  currentUserId,
  onSendFriendRequest,
}) => {
  const [searchTerm, setSearchTerm] = useState("");

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
          width: "90%",
          maxWidth: "500px",
          maxHeight: "90%",
          overflowY: "auto",
          position: "relative",
        }}>
        <button
          onClick={onClose}
          style={{
            position: "absolute",
            top: "10px",
            right: "10px",
            background: "none",
            border: "none",
            fontSize: "24px",
            cursor: "pointer",
            color: "var(--text-color)",
          }}>
          <FaTimes />
        </button>
        <h2 style={{ marginBottom: "20px", color: "var(--primary-color)" }}>
          Add New Friend
        </h2>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            marginBottom: "20px",
            background: "rgba(150, 111, 214, 0.1)",
            borderRadius: "25px",
            padding: "10px 15px",
          }}>
          <FaSearch
            style={{ color: "var(--text-color)", marginRight: "10px" }}
          />
          <input
            type="text"
            placeholder="Search users..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              border: "none",
              background: "transparent",
              color: "var(--text-color)",
              fontSize: "16px",
              outline: "none",
              width: "100%",
            }}
          />
        </div>
        {/* User list would go here */}
      </div>
    </div>
  );
};

export default AddFriendModal;
