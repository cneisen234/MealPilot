import React, { useState, useEffect } from "react";
import { User, PaymentTier, Interest, PrivacySetting, Item } from "../types";
import {
  getProfile,
  updateProfilePicture,
  addInterestCategory,
  addItemToCategory,
  removeItemFromCategory,
  deleteInterestCategory,
  updateItemRating,
} from "../utils/api";
import EditProfileModal from "../components/profile/EditProfileModal";
import AddInterestCategoryModal from "../components/interests/AddInterestCategoryModal";
import ConfirmDeleteModal from "../components/ConfirmDeleteModal";
import {
  FaChevronDown,
  FaChevronUp,
  FaPlus,
  FaMinus,
  FaStar,
} from "react-icons/fa";

const StarRating: React.FC<{
  rating: number;
  onRatingChange: (rating: number) => void;
}> = ({ rating, onRatingChange }) => {
  return (
    <div style={{ display: "flex", alignItems: "center" }}>
      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((star) => (
        <FaStar
          key={star}
          style={{
            cursor: "pointer",
            color: star <= rating ? "var(--primary-color)" : "#e0e0e0",
          }}
          onClick={() => onRatingChange(star)}
        />
      ))}
      <input
        type="range"
        min="1"
        max="10"
        value={rating}
        onChange={(e) => onRatingChange(Number(e.target.value))}
        style={{
          position: "absolute",
          width: "1px",
          height: "1px",
          overflow: "hidden",
          clip: "rect(1px, 1px, 1px, 1px)",
        }}
      />
    </div>
  );
};

const Profile: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAddInterestModalOpen, setIsAddInterestModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Interest | null>(
    null
  );
  const [newItemName, setNewItemName] = useState("");
  const [newItemRating, setNewItemRating] = useState(5);
  const [isHovering, setIsHovering] = useState(false);
  const [expandedCategory, setExpandedCategory] = useState<number | null>(null);
  const [deletingCategory, setDeletingCategory] = useState<Interest | null>(
    null
  );

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

  const toggleCategory = (interestId: number) => {
    setExpandedCategory(expandedCategory === interestId ? null : interestId);
    setSelectedCategory(
      user?.interests.find((i) => i.id === interestId) || null
    );
  };

  const handleProfilePictureClick = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file && user) {
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64String = reader.result as string;
          updateProfilePicture(user.id, base64String)
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

  const handleAddInterestCategory = async (
    newInterest: Omit<Interest, "id">
  ) => {
    if (user) {
      try {
        const response = await addInterestCategory(newInterest);
        setUser((prevUser) => {
          if (prevUser) {
            return {
              ...prevUser,
              interests: [...prevUser.interests, response],
            };
          }
          return prevUser;
        });
      } catch (error) {
        console.error("Error adding interest category:", error);
      }
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  const handleCategorySelect = (interest: Interest) => {
    setSelectedCategory(interest);
  };

  const handleAddItem = async (categoryId: number) => {
    if (newItemName.trim() && newItemRating >= 1 && newItemRating <= 10) {
      try {
        const newItem = await addItemToCategory(categoryId, {
          name: newItemName.trim(),
          rating: newItemRating,
        });
        setUser((prevUser) => {
          if (prevUser) {
            const updatedInterests = prevUser.interests.map((interest) =>
              interest.id === categoryId
                ? { ...interest, items: [...interest.items, newItem] }
                : interest
            );
            return { ...prevUser, interests: updatedInterests };
          }
          return prevUser;
        });
        setNewItemName("");
        setNewItemRating(5);
      } catch (error) {
        console.error("Error adding item:", error);
      }
    }
  };

  const handleRemoveItem = async (categoryId: number, itemId: number) => {
    try {
      await removeItemFromCategory(categoryId, itemId);
      setUser((prevUser) => {
        if (!prevUser) return null;
        return {
          ...prevUser,
          interests: prevUser.interests.map((interest) =>
            interest.id === categoryId
              ? {
                  ...interest,
                  items: interest.items.filter((item) => item.id !== itemId),
                }
              : interest
          ),
        };
      });
    } catch (error) {
      console.error("Error removing item:", error);
      // Optionally, show an error message to the user
    }
  };

  const handleUpdateItemRating = async (
    categoryId: number,
    itemId: number,
    newRating: number
  ) => {
    try {
      console.log(newRating);
      await updateItemRating(categoryId, itemId, newRating);
      setUser((prevUser) => {
        if (prevUser) {
          const updatedInterests = prevUser.interests.map((interest) =>
            interest.id === categoryId
              ? {
                  ...interest,
                  items: interest.items.map((item) =>
                    item.id === itemId ? { ...item, rating: newRating } : item
                  ),
                }
              : interest
          );
          return { ...prevUser, interests: updatedInterests };
        }
        return prevUser;
      });
    } catch (error) {
      console.error("Error updating item rating:", error);
    }
  };

  const handleDeleteCategory = async (category: Interest) => {
    setDeletingCategory(category);
  };

  const confirmDeleteCategory = async () => {
    if (deletingCategory) {
      try {
        await deleteInterestCategory(deletingCategory.id);
        setUser((prevUser) => {
          if (prevUser) {
            return {
              ...prevUser,
              interests: prevUser.interests.filter(
                (interest) => interest.id !== deletingCategory.id
              ),
            };
          }
          return prevUser;
        });
        setExpandedCategory(null);
      } catch (error) {
        console.error("Error deleting category:", error);
      } finally {
        setDeletingCategory(null);
      }
    }
  };

  if (!user) {
    return <div>Loading...</div>;
  }

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
              {user.payment_tier !== undefined
                ? user.payment_tier
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
          padding: "20px",
          boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
          marginTop: "20px",
          position: "relative",
        }}>
        <h2
          style={{
            fontSize: "1.6em",
            marginBottom: "15px",
            color: "var(--primary-color)",
            borderBottom: "2px solid var(--primary-color)",
            paddingBottom: "10px",
          }}>
          Interests
        </h2>
        <button
          onClick={() => setIsAddInterestModalOpen(true)}
          style={{
            position: "absolute",
            top: "20px",
            right: "20px",
            background: "var(--secondary-color)",
            color: "white",
            border: "none",
            padding: "5px 10px",
            borderRadius: "5px",
            cursor: "pointer",
            fontSize: "0.9em",
          }}>
          <FaPlus style={{ marginRight: "5px" }} /> New Category
        </button>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
          {user?.interests?.map((interest) => (
            <div
              key={interest.id}
              style={{ width: "100%", marginBottom: "10px" }}>
              <div
                onClick={() => toggleCategory(interest.id)}
                style={{
                  background:
                    expandedCategory === interest.id
                      ? "rgba(150, 111, 214, 0.1)"
                      : "transparent",
                  padding: "10px",
                  borderRadius: "5px",
                  cursor: "pointer",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}>
                <span
                  style={{
                    fontSize: "1.1em",
                    color: "var(--secondary-color)",
                  }}>
                  {interest.category}
                </span>
                {expandedCategory === interest.id ? (
                  <FaChevronUp />
                ) : (
                  <FaChevronDown />
                )}
              </div>
              {expandedCategory === interest.id && (
                <div style={{ padding: "10px", fontSize: "0.9em" }}>
                  {interest?.items?.map((item) => (
                    <div
                      key={item.id}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: "5px",
                      }}>
                      <span>{item.name}</span>
                      <div style={{ display: "flex", alignItems: "center" }}>
                        <StarRating
                          rating={item.rating}
                          onRatingChange={(newRating) =>
                            handleUpdateItemRating(
                              interest.id,
                              item.id,
                              newRating
                            )
                          }
                        />
                        <button
                          onClick={() => handleRemoveItem(interest.id, item.id)}
                          style={{
                            background: "none",
                            border: "none",
                            color: "red",
                            cursor: "pointer",
                            padding: "2px",
                            marginLeft: "5px",
                          }}>
                          <FaMinus />
                        </button>
                      </div>
                    </div>
                  ))}
                  <div style={{ marginTop: "10px" }}>
                    <input
                      type="text"
                      value={newItemName}
                      onChange={(e) => setNewItemName(e.target.value)}
                      placeholder="New item"
                      style={{
                        padding: "5px",
                        borderRadius: "3px",
                        border: "1px solid var(--primary-color)",
                        fontSize: "0.9em",
                        width: "100%",
                        marginBottom: "5px",
                      }}
                    />
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}>
                      <StarRating
                        rating={newItemRating}
                        onRatingChange={setNewItemRating}
                      />
                      <button
                        onClick={() => handleAddItem(interest.id)}
                        style={{
                          background: "var(--primary-color)",
                          color: "white",
                          border: "none",
                          padding: "5px 10px",
                          borderRadius: "3px",
                          cursor: "pointer",
                          fontSize: "0.9em",
                        }}>
                        <FaPlus />
                      </button>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteCategory(interest)}
                    style={{
                      background: "var(--surface-color)",
                      color: "var(--text-color)",
                      border: "1px solid var(--text-color)",
                      padding: "5px 10px",
                      borderRadius: "3px",
                      cursor: "pointer",
                      fontSize: "0.9em",
                      marginTop: "10px",
                    }}>
                    Delete Category
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
        {user?.interests?.length === 0 && (
          <div style={{ textAlign: "center", color: "var(--text-color)" }}>
            <p>No interests added yet</p>
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

      {isAddInterestModalOpen && (
        <AddInterestCategoryModal
          onClose={() => setIsAddInterestModalOpen(false)}
          onAddCategory={handleAddInterestCategory}
          user={user}
        />
      )}

      <ConfirmDeleteModal
        isOpen={!!deletingCategory}
        onClose={() => setDeletingCategory(null)}
        onConfirm={confirmDeleteCategory}
        itemName={deletingCategory?.category || ""}
      />
    </div>
  );
};

export default Profile;
