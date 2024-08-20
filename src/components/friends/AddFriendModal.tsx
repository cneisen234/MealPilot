import React, { useState, useEffect } from "react";
import { FaTimes, FaSearch, FaUserPlus, FaClock } from "react-icons/fa";
import { User, FriendRequest } from "../../types";
import api from "../../utils/api";
import InfoModal from "../common/InfoModal";

interface UserWithRequestStatus extends User {
  friendRequestStatus: { status: string; requestId: number };
}

interface AddFriendModalProps {
  onClose: () => void;
  currentUserId: number;
  onSendFriendRequest: (
    request: Omit<FriendRequest, "id" | "createdAt">
  ) => void;
  maxFriends: number;
  currentFriendsCount: number;
}

const AddFriendModal: React.FC<AddFriendModalProps> = ({
  onClose,
  currentUserId,
  onSendFriendRequest,
  maxFriends,
  currentFriendsCount,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [users, setUsers] = useState<UserWithRequestStatus[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserWithRequestStatus[]>(
    []
  );
  const [infoModalMessage, setInfoModalMessage] = useState("");
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);
  const [pendingRequests, setPendingRequests] = useState<User[]>([]);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const usersResponse = await api.get("/users/not-friends");
        setUsers(usersResponse.data);
        setFilteredUsers(usersResponse.data);
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };

    fetchUsers();
  }, [isInfoModalOpen]);

  useEffect(() => {
    if (searchTerm.trim() === "") {
      setFilteredUsers([]);
    } else {
      const filtered = users.filter(
        (user) =>
          user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
          user.email.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredUsers(filtered);
    }
  }, [searchTerm, users]);

  const handleSendFriendRequest = async (receiverId: number) => {
    if (currentFriendsCount >= maxFriends) {
      setIsInfoModalOpen(true);
      setInfoModalMessage(
        "You've reached the maximum number of friends for your current plan."
      );
      return;
    }

    try {
      const request = {
        senderId: currentUserId,
        receiverId,
        status: "pending",
      };
      // @ts-ignore
      onSendFriendRequest(request);
      // @ts-ignore
      setPendingRequests([...pendingRequests, request]);
      setIsInfoModalOpen(true);
      setInfoModalMessage(
        "Friend request sent! We'll let them know and they will be added as soon as they accept."
      );
    } catch (error) {
      console.error("Error sending friend request:", error);
    }
  };

  const isRequestPending = (user: UserWithRequestStatus) => {
    console.log(user);
    return user.friendRequestStatus?.status === "pending";
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
        {currentFriendsCount >= maxFriends && (
          <p style={{ color: "red", marginBottom: "10px" }}>
            You've reached the maximum number of friends for your current plan.
          </p>
        )}
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
              {isRequestPending(user) ? (
                <button
                  style={{
                    background: "gray",
                    color: "white",
                    border: "none",
                    borderRadius: "5px",
                    padding: "5px 10px",
                    cursor: "not-allowed",
                    display: "flex",
                    alignItems: "center",
                  }}
                  disabled>
                  <FaClock style={{ marginRight: "5px" }} />
                  Pending
                </button>
              ) : (
                <button
                  onClick={() => handleSendFriendRequest(user.id)}
                  style={{
                    background:
                      currentFriendsCount < maxFriends
                        ? "var(--primary-color)"
                        : "gray",
                    color: "white",
                    border: "none",
                    borderRadius: "5px",
                    padding: "5px 10px",
                    cursor:
                      currentFriendsCount < maxFriends
                        ? "pointer"
                        : "not-allowed",
                    display: "flex",
                    alignItems: "center",
                  }}
                  disabled={currentFriendsCount >= maxFriends}>
                  <FaUserPlus style={{ marginRight: "5px" }} />
                  Add
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
      <InfoModal
        isOpen={isInfoModalOpen}
        onClose={() => setIsInfoModalOpen(false)}
        message={infoModalMessage}
      />
    </div>
  );
};

export default AddFriendModal;
