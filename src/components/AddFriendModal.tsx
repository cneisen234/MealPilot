import React, { useState, useEffect } from "react";
import { FaTimes, FaSearch, FaUserPlus } from "react-icons/fa";
import { User, FriendRequest, FriendRequestStatus } from "../types";
import api from "../utils/api";

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
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await api.get("/users/not-friends");
        setUsers(response.data);
        setFilteredUsers(response.data);
      } catch (error) {
        console.error("Error fetching users:", error);
      }
    };

    fetchUsers();
  }, []);

  useEffect(() => {
    const filtered = users.filter(
      (user) =>
        user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredUsers(filtered);
  }, [searchTerm, users]);

  const handleSendFriendRequest = async (receiverId: number) => {
    try {
      const request = {
        senderId: currentUserId,
        receiverId,
        status: FriendRequestStatus.Pending,
      };
      await onSendFriendRequest(request);

      // Close the modal or update UI as needed
      onClose();
    } catch (error) {
      console.error("Error sending friend request:", error);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((word) => word[0])
      .join("")
      .toUpperCase();
  };

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
        <div style={{ maxHeight: "400px", overflowY: "auto" }}>
          {filteredUsers.map((user) => (
            <div
              key={user.id}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "10px 0",
                borderBottom: "1px solid rgba(0, 0, 0, 0.1)",
              }}>
              <div style={{ display: "flex", alignItems: "center" }}>
                {user.avatar ? (
                  <img
                    src={user.avatar}
                    alt={user.name}
                    style={{
                      width: "40px",
                      height: "40px",
                      borderRadius: "50%",
                      marginRight: "10px",
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: "40px",
                      height: "40px",
                      borderRadius: "50%",
                      backgroundColor: "var(--primary-color)",
                      color: "white",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      marginRight: "10px",
                      fontSize: "16px",
                      fontWeight: "bold",
                    }}>
                    {getInitials(user.name)}
                  </div>
                )}
                <div>
                  <div style={{ fontWeight: "bold" }}>{user.name}</div>
                  <div
                    style={{ fontSize: "0.8em", color: "var(--text-color)" }}>
                    @{user.username}
                  </div>
                </div>
              </div>
              <button
                onClick={() => handleSendFriendRequest(user.id)}
                style={{
                  background: "var(--primary-color)",
                  color: "white",
                  border: "none",
                  borderRadius: "5px",
                  padding: "5px 10px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                }}>
                <FaUserPlus style={{ marginRight: "5px" }} />
                Add
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AddFriendModal;
