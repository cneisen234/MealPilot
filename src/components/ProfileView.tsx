import React, { useState, useEffect } from "react";
import { FaTimes, FaChevronDown, FaChevronUp } from "react-icons/fa";
import { getFriendProfile } from "../utils/api";
import AnimatedTechIcon from "./animatedTechIcon";

interface FriendProfile {
  id: number;
  name: string;
  username: string;
  avatar: string | null;
  bio: string | null;
  interests: Array<{
    category: string;
    items: Array<{ name: string; rating: number }>;
  }>;
}

interface ProfileViewProps {
  friendId: number;
  onClose: () => void;
}

const ProfileView: React.FC<ProfileViewProps> = ({ friendId, onClose }) => {
  const [friend, setFriend] = useState<FriendProfile | null>(null);
  const [expandedInterest, setExpandedInterest] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadFriendProfile = async () => {
      try {
        setIsLoading(true);
        const response = await getFriendProfile(friendId);
        setFriend(response.data);
      } catch (error) {
        console.error("Error loading friend profile:", error);
        setError("Failed to load friend profile. Please try again later.");
      } finally {
        setIsLoading(false);
      }
    };

    loadFriendProfile();
  }, [friendId]);

  const toggleInterest = (category: string) => {
    setExpandedInterest((prev) => (prev === category ? null : category));
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  if (isLoading) {
    return <AnimatedTechIcon size={100} speed={10} />;
  }

  if (error) {
    return <div>{error}</div>;
  }

  if (!friend) {
    return <div>Friend not found</div>;
  }

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
          {friend.avatar ? (
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
          ) : (
            <div
              style={{
                width: "100px",
                height: "100px",
                borderRadius: "50%",
                marginRight: "20px",
                backgroundColor: "var(--primary-color)",
                color: "white",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                fontSize: "36px",
                fontWeight: "bold",
              }}>
              {getInitials(friend.name)}
            </div>
          )}
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
          {friend.interests && friend.interests.length > 0 ? (
            friend.interests.map((interest, index) => (
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
            ))
          ) : (
            <p>No interests to display.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfileView;
