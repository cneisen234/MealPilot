// src/pages/Profile.tsx
import React, { useState, useEffect } from "react";
import { User, PaymentTier } from "../types";
import { getProfile, updateProfilePicture } from "../utils/api";
import EditProfileModal from "../components/profile/EditProfileModal";

const Profile: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isHovering, setIsHovering] = useState(false);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await getProfile();
        setUser(response.data);
      } catch (error) {
        console.error("Error fetching user profile:", error);
      }
    };

    fetchUser();
  }, []);

  const handleProfilePictureClick = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64String = reader.result as string;
          updateProfilePicture(user!.id, base64String)
            .then((updatedUser) => {
              setUser(updatedUser);
            })
            .catch((error) =>
              console.error("Error updating profile picture:", error)
            );
        };
        reader.readAsDataURL(file);
      }
    };
    input.click();
  };

  if (!user) {
    return <div>Loading...</div>;
  }

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  return (
    <div style={{ maxWidth: "800px", margin: "0 auto", padding: "20px" }}>
      <div
        style={{
          background: "var(--surface-color)",
          borderRadius: "15px",
          padding: "30px",
          boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
        }}>
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            marginBottom: "20px",
          }}>
          <div
            style={{
              position: "relative",
              width: "150px",
              height: "150px",
              cursor: "pointer",
              marginRight: "30px",
            }}
            onMouseEnter={() => setIsHovering(true)}
            onMouseLeave={() => setIsHovering(false)}
            onClick={handleProfilePictureClick}>
            {user.avatar ? (
              <img
                src={user.avatar}
                alt={user.name}
                style={{
                  width: "100%",
                  height: "100%",
                  borderRadius: "50%",
                  border: "3px solid var(--primary-color)",
                  transition: "filter 0.3s ease",
                  filter: isHovering ? "brightness(70%)" : "none",
                }}
              />
            ) : (
              <div
                style={{
                  width: "100%",
                  height: "100%",
                  borderRadius: "50%",
                  backgroundColor: "var(--primary-color)",
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  fontSize: "48px",
                  color: "white",
                  transition: "filter 0.3s ease",
                  filter: isHovering ? "brightness(70%)" : "none",
                }}>
                {getInitials(user.name)}
              </div>
            )}
            {isHovering && (
              <div
                style={{
                  position: "absolute",
                  top: "50%",
                  left: "50%",
                  transform: "translate(-50%, -50%)",
                  color: "white",
                  fontSize: "14px",
                  textAlign: "center",
                }}>
                Click to update
              </div>
            )}
          </div>
          <div style={{ flex: 1 }}>
            <h1
              style={{
                fontSize: "2.5em",
                marginBottom: "5px",
                color: "var(--primary-color)",
              }}>
              {user.name}
            </h1>
            <p
              style={{
                fontSize: "1.2em",
                color: "var(--text-color)",
                marginBottom: "15px",
              }}>
              @{user.username}
            </p>
            <p style={{ color: "var(--text-color)", marginBottom: "10px" }}>
              <strong>Bio:</strong> {user.bio || "No bio added yet"}
            </p>
            <p style={{ color: "var(--text-color)", marginBottom: "10px" }}>
              <strong>Location:</strong>{" "}
              {user.city && user.state
                ? `${user.city}, ${user.state}`
                : "Location not specified"}
            </p>
            <p style={{ color: "var(--text-color)", marginBottom: "10px" }}>
              <strong>Membership:</strong>{" "}
              {user.paymentTier !== undefined
                ? PaymentTier[user.paymentTier]
                : "Membership status not set"}
            </p>
            <button
              onClick={() => setIsEditModalOpen(true)}
              style={{
                background: "var(--primary-color)",
                color: "white",
                border: "none",
                padding: "10px 20px",
                borderRadius: "5px",
                cursor: "pointer",
                marginTop: "10px",
              }}>
              Edit Profile
            </button>
          </div>
        </div>
      </div>

      <div
        style={{
          background: "var(--surface-color)",
          borderRadius: "15px",
          padding: "30px",
          boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
          marginTop: "20px",
        }}>
        <h2
          style={{
            fontSize: "1.8em",
            marginBottom: "20px",
            color: "var(--primary-color)",
            borderBottom: "2px solid var(--primary-color)",
            paddingBottom: "10px",
          }}>
          Interests
        </h2>
        {user.interests && user.interests.length > 0 ? (
          user.interests.map((interest, index) => (
            <div key={index} style={{ marginBottom: "30px" }}>
              <h3
                style={{
                  fontSize: "1.4em",
                  color: "var(--secondary-color)",
                  marginBottom: "15px",
                }}>
                {interest.category}
              </h3>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
                {interest.items.map((item, itemIndex) => (
                  <div
                    key={itemIndex}
                    style={{
                      background: "rgba(150, 111, 214, 0.1)",
                      padding: "10px 15px",
                      borderRadius: "20px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}>
                    <span>{item.name}</span>
                    <span
                      style={{
                        marginLeft: "10px",
                        background: "var(--primary-color)",
                        color: "white",
                        borderRadius: "50%",
                        width: "25px",
                        height: "25px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "0.8em",
                      }}>
                      {item.rating}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))
        ) : (
          <div style={{ textAlign: "center", color: "var(--text-color)" }}>
            <p>No interests added yet</p>
            <button
              style={{
                background: "var(--secondary-color)",
                color: "white",
                border: "none",
                padding: "10px 20px",
                borderRadius: "5px",
                cursor: "pointer",
                marginTop: "10px",
              }}>
              Add Interests
            </button>
          </div>
        )}
      </div>

      {isEditModalOpen && (
        <EditProfileModal
          user={user}
          onClose={() => setIsEditModalOpen(false)}
          onSave={(updatedUser) => {
            setUser(updatedUser);
            setIsEditModalOpen(false);
          }}
        />
      )}
    </div>
  );
};

export default Profile;
