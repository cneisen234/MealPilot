// src/components/AddFriendModal.tsx
import React, { useState } from "react";
import { FaTimes, FaSearch, FaUserPlus } from "react-icons/fa";
import { User, Interest, Item } from "../types";

const dummyUsers: User[] = [
  {
    id: 6,
    name: "Frank Miller",
    username: "frank_m",
    avatar: "https://i.pravatar.cc/150?img=6",
    bio: "Tech enthusiast and coffee lover",
    interests: [
      {
        category: "Technology",
        items: [
          { name: "Programming", rating: 9 },
          { name: "AI", rating: 8 },
        ],
      },
      {
        category: "Coffee",
        items: [
          { name: "Espresso", rating: 10 },
          { name: "Latte Art", rating: 7 },
        ],
      },
    ],
  },
  {
    id: 7,
    name: "Grace Lee",
    username: "grace_l",
    avatar: "https://i.pravatar.cc/150?img=7",
    bio: "Fitness junkie and healthy food advocate",
    interests: [
      {
        category: "Fitness",
        items: [
          { name: "Yoga", rating: 9 },
          { name: "Running", rating: 8 },
        ],
      },
      {
        category: "Cooking",
        items: [
          { name: "Vegan Recipes", rating: 10 },
          { name: "Meal Prep", rating: 8 },
        ],
      },
    ],
  },
  {
    id: 8,
    name: "Henry Wilson",
    username: "henry_w",
    avatar: "https://i.pravatar.cc/150?img=8",
    bio: "Aspiring musician and vinyl collector",
    interests: [
      {
        category: "Music",
        items: [
          { name: "Guitar", rating: 9 },
          { name: "Songwriting", rating: 7 },
        ],
      },
      {
        category: "Vinyl",
        items: [
          { name: "Record Collecting", rating: 10 },
          { name: "Turntable Maintenance", rating: 8 },
        ],
      },
    ],
  },
];

interface AddFriendModalProps {
  onClose: () => void;
}

const AddFriendModal: React.FC<AddFriendModalProps> = ({ onClose }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [users, setUsers] = useState<User[]>(dummyUsers);

  const filteredUsers = users.filter(
    (user) =>
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.username.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSendRequest = (userId: number) => {
    console.log(`Friend request sent to user with ID: ${userId}`);
    setUsers(users.filter((user) => user.id !== userId));
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
        {filteredUsers.map((user) => (
          <div
            key={user.id}
            style={{
              display: "flex",
              alignItems: "center",
              marginBottom: "15px",
              padding: "10px",
              borderRadius: "10px",
              background: "var(--surface-color)",
              boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
            }}>
            <img
              src={user.avatar}
              alt={user.name}
              style={{
                width: "50px",
                height: "50px",
                borderRadius: "50%",
                marginRight: "15px",
              }}
            />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: "bold", color: "var(--text-color)" }}>
                {user.name}
              </div>
              <div
                style={{
                  fontSize: "14px",
                  color: "var(--text-color)",
                  opacity: 0.7,
                }}>
                @{user.username}
              </div>
            </div>
            <button
              onClick={() => handleSendRequest(user.id)}
              style={{
                background: "var(--primary-color)",
                color: "white",
                border: "none",
                borderRadius: "20px",
                padding: "8px 15px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                fontSize: "14px",
                transition: "all 0.3s ease",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.transform = "scale(1.05)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.transform = "scale(1)")
              }>
              <FaUserPlus style={{ marginRight: "5px" }} /> Add
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AddFriendModal;
