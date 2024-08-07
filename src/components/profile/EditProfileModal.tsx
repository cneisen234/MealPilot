import React, { useState } from "react";
import { User, PrivacySetting } from "../../types";
import { updateProfile } from "../../utils/api";

interface EditProfileModalProps {
  user: User;
  onClose: () => void;
  onSave: (updatedUser: User) => void;
}

const EditProfileModal: React.FC<EditProfileModalProps> = ({
  user,
  onClose,
  onSave,
}) => {
  const [name, setName] = useState(user.name);
  const [username, setUsername] = useState(user.username);
  const [bio, setBio] = useState(user.bio || "");
  const [city, setCity] = useState(user.city || "");
  const [state, setState] = useState(user.state || "");
  const [bioVisibility, setBioVisibility] = useState(user.bioVisibility);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const updatedUser = await updateProfile(user.id, {
        name,
        username,
        bio,
        city,
        state,
        bioVisibility,
      });
      onSave(updatedUser);
    } catch (error) {
      console.error("Error updating profile:", error);
    }
  };

  const inputStyle = {
    width: "100%",
    padding: "10px",
    borderRadius: "5px",
    border: "1px solid var(--primary-color)",
    fontSize: "16px",
    boxSizing: "border-box" as "border-box",
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
          boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
        }}>
        <h2 style={{ color: "var(--primary-color)", marginBottom: "20px" }}>
          Edit Profile
        </h2>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: "15px" }}>
            <label
              htmlFor="name"
              style={{
                display: "block",
                marginBottom: "5px",
                color: "var(--text-color)",
              }}>
              Name
            </label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={inputStyle}
            />
          </div>
          <div style={{ marginBottom: "15px" }}>
            <label
              htmlFor="username"
              style={{
                display: "block",
                marginBottom: "5px",
                color: "var(--text-color)",
              }}>
              Username
            </label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              style={inputStyle}
            />
          </div>
          <div style={{ marginBottom: "15px" }}>
            <label
              htmlFor="bio"
              style={{
                display: "block",
                marginBottom: "5px",
                color: "var(--text-color)",
              }}>
              Bio
            </label>
            <textarea
              id="bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              style={{ ...inputStyle, minHeight: "100px", resize: "vertical" }}
            />
          </div>
          <div style={{ marginBottom: "15px" }}>
            <label
              htmlFor="city"
              style={{
                display: "block",
                marginBottom: "5px",
                color: "var(--text-color)",
              }}>
              City
            </label>
            <input
              type="text"
              id="city"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              style={inputStyle}
            />
          </div>
          <div style={{ marginBottom: "15px" }}>
            <label
              htmlFor="state"
              style={{
                display: "block",
                marginBottom: "5px",
                color: "var(--text-color)",
              }}>
              State
            </label>
            <input
              type="text"
              id="state"
              value={state}
              onChange={(e) => setState(e.target.value)}
              style={inputStyle}
            />
          </div>
          <div style={{ marginBottom: "20px" }}>
            <label
              htmlFor="bioVisibility"
              style={{
                display: "block",
                marginBottom: "5px",
                color: "var(--text-color)",
              }}>
              Bio Visibility
            </label>
            <select
              id="bioVisibility"
              value={bioVisibility}
              onChange={(e) =>
                setBioVisibility(e.target.value as PrivacySetting)
              }
              style={{
                ...inputStyle,
                appearance: "none",
                backgroundColor: "white",
              }}>
              <option value={PrivacySetting.Public}>Public</option>
              <option value={PrivacySetting.FriendsOnly}>Friends Only</option>
              <option value={PrivacySetting.Private}>Private</option>
            </select>
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: "10px",
            }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: "10px 20px",
                borderRadius: "5px",
                border: "none",
                backgroundColor: "var(--surface-color)",
                color: "var(--text-color)",
                fontSize: "16px",
                cursor: "pointer",
              }}>
              Cancel
            </button>
            <button
              type="submit"
              style={{
                padding: "10px 20px",
                borderRadius: "5px",
                border: "none",
                backgroundColor: "var(--primary-color)",
                color: "white",
                fontSize: "16px",
                cursor: "pointer",
              }}>
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditProfileModal;
