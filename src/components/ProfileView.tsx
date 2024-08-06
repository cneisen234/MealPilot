// src/components/ProfileView.tsx
import React, { useState } from "react";
import { FaTimes, FaChevronDown, FaChevronUp } from "react-icons/fa";
import { User } from "../types";

interface ProfileViewProps {
  friend: User;
  onClose: () => void;
}

const ProfileView: React.FC<ProfileViewProps> = ({ friend, onClose }) => {
  const [expandedInterest, setExpandedInterest] = useState<string | null>(null);

  const toggleInterest = (category: string) => {
    if (expandedInterest === category) {
      setExpandedInterest(null);
    } else {
      setExpandedInterest(category);
    }
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
          maxWidth: "500px",
          width: "90%",
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
        <div
          style={{
            display: "flex",
            alignItems: "center",
            marginBottom: "20px",
          }}>
          <img
            src={friend.avatar}
            alt={friend.name}
            style={{
              width: "100px",
              height: "100px",
              borderRadius: "50%",
              marginRight: "20px",
            }}
          />
          <div>
            <h2 style={{ color: "var(--primary-color)", marginBottom: "5px" }}>
              {friend.name}
            </h2>
            <p
              style={{
                color: "var(--text-color)",
                opacity: 0.7,
                marginBottom: "5px",
              }}>
              @{friend.username}
            </p>
          </div>
        </div>
        {friend.bio && (
          <div style={{ marginBottom: "20px" }}>
            <h3 style={{ color: "var(--primary-color)", marginBottom: "10px" }}>
              Bio
            </h3>
            <p style={{ color: "var(--text-color)" }}>{friend.bio}</p>
          </div>
        )}
        <div>
          <h3 style={{ color: "var(--primary-color)", marginBottom: "10px" }}>
            Interests
          </h3>
          {friend.interests.map((interest, index) => (
            <div key={index} style={{ marginBottom: "10px" }}>
              <div
                onClick={() => toggleInterest(interest.category)}
                style={{
                  background: "rgba(150, 111, 214, 0.1)",
                  color: "var(--primary-color)",
                  padding: "10px 15px",
                  borderRadius: "15px",
                  fontSize: "16px",
                  cursor: "pointer",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}>
                {interest.category}
                {expandedInterest === interest.category ? (
                  <FaChevronUp />
                ) : (
                  <FaChevronDown />
                )}
              </div>
              {expandedInterest === interest.category && (
                <div style={{ marginTop: "10px", paddingLeft: "15px" }}>
                  {interest.items.map((item, itemIndex) => (
                    <div
                      key={itemIndex}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: "5px",
                        color: "var(--text-color)",
                      }}>
                      <span>{item.name}</span>
                      <span
                        style={{
                          background: "var(--primary-color)",
                          color: "white",
                          borderRadius: "50%",
                          width: "25px",
                          height: "25px",
                          display: "flex",
                          justifyContent: "center",
                          alignItems: "center",
                          fontSize: "12px",
                        }}>
                        {item.rating}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ProfileView;
