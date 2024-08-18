import React, { useState, useEffect } from "react";
import { User, PaymentTier, Interest } from "../types";
import {
  getProfile,
  updateProfilePicture,
  addInterestCategory,
  addItemToCategory,
  removeItemFromCategory,
  deleteInterestCategory,
  updateItemRating,
  getUserLocation,
  updatePaymentMethod,
  getSubscriptionStatus,
  checkPrimaryPaymentMethod,
} from "../utils/api";
import EditProfileModal from "../components/profile/EditProfileModal";
import AddInterestCategoryModal from "../components/interests/AddInterestCategoryModal";
import ConfirmDeleteModal from "../components/ConfirmDeleteModal";
import InfoModal from "../components/InfoModal";
import StarRating from "../components/StarRating";
import { useLocation } from "react-router-dom";
import { useTutorial } from "../context/TutorialContext";
import {
  FaChevronDown,
  FaChevronUp,
  FaPlus,
  FaMinus,
  FaStar,
  FaLock,
  FaTimes,
  FaUserPlus,
  FaInfoCircle,
  FaCreditCard,
} from "react-icons/fa";
import { Link } from "react-router-dom";
import AnimatedTechIcon from "../components/animatedTechIcon";
import { CardElement, useElements, useStripe } from "@stripe/react-stripe-js";

const Profile: React.FC = () => {
  const { startTutorial } = useTutorial();
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
  const [infoModalMessage, setInfoModalMessage] = useState("");
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);
  const [userLocation, setUserLocation] = useState<{
    city: string;
    state: string;
  } | null>(null);
  const [showPaymentUpdate, setShowPaymentUpdate] = useState(false);
  const [paymentUpdateError, setPaymentUpdateError] = useState<string | null>(
    null
  );
  const [paymentUpdateSuccess, setPaymentUpdateSuccess] = useState(false);
  const [subscriptionStatus, setSubscriptionStatus] = useState<any>(null);
  const [primaryPaymentMethod, setPrimaryPaymentMethod] = useState<any>(null);

  const stripe = useStripe();
  const elements = useElements();

  interface LocationState {
    fromOnboarding?: boolean;
  }

  const appLocation = useLocation();

  useEffect(() => {
    fetchUserProfile();
    fetchUserLocation();
    fetchSubscriptionStatus();
  }, []);

  useEffect(() => {
    // Check if user just completed onboarding
    const locationState = appLocation.state as LocationState;
    if (locationState && locationState.fromOnboarding) {
      startTutorial();
      locationState.fromOnboarding = false;
      // Clear the state after showing the tutorial
      window.history.replaceState({}, document.title);
    }
  }, [appLocation, startTutorial]);

  useEffect(() => {
    if (user?.id) {
      fetchPrimaryPaymentMethod(user);
    }
  }, [user]);

  const fetchPrimaryPaymentMethod = async (user: User) => {
    try {
      const paymentMethod = await checkPrimaryPaymentMethod(user?.id);
      setPrimaryPaymentMethod(paymentMethod);
    } catch (error) {
      console.error("Error fetching primary payment method:", error);
    }
  };

  const fetchUserProfile = async () => {
    try {
      const response = await getProfile();
      setUser(response.data);
    } catch (error) {
      console.error("Error fetching user profile:", error);
    }
  };

  const fetchUserLocation = async () => {
    try {
      const geoLocation = await getUserLocation();
      setUserLocation(geoLocation);
    } catch (error) {
      console.error("Error fetching user location:", error);
      // Fall back to profile location if geolocation fails
      if (user) {
        setUserLocation({
          city: user.city || "Unknown",
          state: user.state || "Unknown",
        });
      }
    }
  };

  const handleUpdatePaymentMethod = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!stripe || !elements) {
      return;
    }

    const cardElement = elements.getElement(CardElement);

    if (cardElement) {
      setPaymentUpdateError(null);
      setPaymentUpdateSuccess(false);

      try {
        // Create a payment method
        const { error, paymentMethod } = await stripe.createPaymentMethod({
          type: "card",
          card: cardElement,
        });

        if (error) {
          throw new Error(error.message);
        }

        // Send the payment method to your server
        const response = await updatePaymentMethod(paymentMethod.id);

        if (response.success) {
          setPaymentUpdateSuccess(true);
          setShowPaymentUpdate(false);
          // Refresh subscription status
          fetchSubscriptionStatus();
        } else {
          throw new Error(
            response.message || "Failed to update payment method"
          );
        }
      } catch (error: any) {
        setPaymentUpdateError(error.message);
      }
    }
  };

  const getMembershipLimits = (paymentTier: PaymentTier) => {
    switch (paymentTier) {
      case PaymentTier.Free: // 1
        return { maxCategories: 3, maxItems: 5 };
      case PaymentTier.Basic: // 2
        return { maxCategories: 10, maxItems: 20 };
      case PaymentTier.Premium: // 3
      case PaymentTier.Owner: // 4
        return { maxCategories: 20, maxItems: 50 };
      default:
        return { maxCategories: 3, maxItems: 5 }; // Default to Free tier limits
    }
  };

  const canAddCategory = () => {
    if (!user) return false;
    const userTier =
      PaymentTier[user.payment_tier as unknown as keyof typeof PaymentTier];
    const { maxCategories } = getMembershipLimits(userTier);
    return user.interests.length < maxCategories;
  };

  const fetchSubscriptionStatus = async () => {
    try {
      const status = await getSubscriptionStatus();
      setSubscriptionStatus(status);
    } catch (error) {
      console.error("Error fetching subscription status:", error);
    }
  };

  const canAddItem = (categoryId: number) => {
    if (!user) return false;
    const userTier =
      PaymentTier[user.payment_tier as unknown as keyof typeof PaymentTier];
    const { maxItems } = getMembershipLimits(userTier);
    const category = user.interests.find((int) => int.id === categoryId);
    return category ? category?.items?.length < maxItems : false;
  };

  const handleAddInterestCategory = async (
    newInterest: Omit<Interest, "id">
  ) => {
    if (user && canAddCategory()) {
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
        setIsAddInterestModalOpen(false);
      } catch (error) {
        console.error("Error adding interest category:", error);
      }
    } else {
      setInfoModalMessage(
        "You've reached the maximum number of categories for your membership level."
      );
      setIsInfoModalOpen(true);
    }
  };

  const handleAddItem = async (categoryId: number) => {
    if (
      newItemName.trim() &&
      newItemRating >= 1 &&
      newItemRating <= 10 &&
      canAddItem(categoryId)
    ) {
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
    } else if (!canAddItem(categoryId)) {
      setInfoModalMessage(
        "You've reached the maximum number of items for this category based on your membership level."
      );
      setIsInfoModalOpen(true);
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
    }
  };

  const handleUpdateItemRating = async (
    categoryId: number,
    itemId: number,
    newRating: number
  ) => {
    try {
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

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  if (!user) {
    return (
      <AnimatedTechIcon
        style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
        }}
        size={100}
        speed={10}
      />
    );
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
              {userLocation ? (
                `${userLocation.city}, ${userLocation.state}`
              ) : user ? (
                `${user.city || "Unknown"}, ${user.state || "Unknown"}`
              ) : (
                <AnimatedTechIcon size={10} speed={10} />
              )}
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
            background: canAddCategory() ? "var(--secondary-color)" : "gray",
            color: "white",
            border: "none",
            padding: "5px 10px",
            borderRadius: "5px",
            cursor: canAddCategory() ? "pointer" : "not-allowed",
            fontSize: "0.9em",
            display: "flex",
            alignItems: "center",
          }}
          disabled={!canAddCategory()}>
          {canAddCategory() ? (
            <FaPlus style={{ marginRight: "5px" }} />
          ) : (
            <FaLock style={{ marginRight: "5px" }} />
          )}
          New Category
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
                      maxLength={100}
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
                          background: canAddItem(interest.id)
                            ? "var(--primary-color)"
                            : "gray",
                          color: "white",
                          border: "none",
                          padding: "5px 10px",
                          borderRadius: "3px",
                          cursor: canAddItem(interest.id)
                            ? "pointer"
                            : "not-allowed",
                          fontSize: "0.9em",
                        }}
                        disabled={!canAddItem(interest.id)}>
                        {canAddItem(interest.id) ? <FaPlus /> : <FaLock />}
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
      <br />
      {/* Account Management section */}
      <div
        style={{
          background: "var(--surface-color)",
          borderRadius: "15px",
          padding: "20px",
          boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
        }}>
        <h2
          style={{
            fontSize: "1.6em",
            color: "var(--primary-color)",
            marginBottom: "20px",
          }}>
          Account Management
        </h2>
        <div
          style={{
            padding: "15px 0",
            borderBottom: "1px solid rgba(0, 0, 0, 0.1)",
          }}>
          <h3
            style={{
              fontSize: "1.2em",
              color: "var(--text-color)",
              marginBottom: "10px",
            }}>
            Subscription Status
          </h3>
          {subscriptionStatus ? (
            <div>
              <p>
                <strong>Plan:</strong> {subscriptionStatus.plan}
              </p>
              <p>
                <strong>Status:</strong> {subscriptionStatus.status}
              </p>
              {subscriptionStatus.nextBillingDate && (
                <p>
                  <strong>Next Billing Date:</strong>{" "}
                  {new Date(
                    subscriptionStatus.nextBillingDate
                  ).toLocaleDateString()}
                </p>
              )}
              {subscriptionStatus.scheduledDowngrade && (
                <p style={{ color: "var(--secondary-color)" }}>
                  <FaInfoCircle style={{ marginRight: "5px" }} />
                  Scheduled downgrade to{" "}
                  {subscriptionStatus.scheduledDowngrade.newPlan} on{" "}
                  {new Date(
                    subscriptionStatus.scheduledDowngrade.date
                  ).toLocaleDateString()}
                </p>
              )}
            </div>
          ) : (
            <p>Loading subscription status...</p>
          )}
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "15px 0",
            borderBottom: "1px solid rgba(0, 0, 0, 0.1)",
          }}>
          <span style={{ fontSize: "1.1em", color: "var(--text-color)" }}>
            Payment Method
          </span>
          {primaryPaymentMethod?.hasPrimaryPaymentMethod ? (
            <div style={{ display: "flex", alignItems: "center" }}>
              <FaCreditCard style={{ marginRight: "10px" }} />
              <span>
                {primaryPaymentMethod.brand} ending in{" "}
                {primaryPaymentMethod.last4}
              </span>
            </div>
          ) : (
            <span>No payment method on file</span>
          )}
          <button
            onClick={() => setShowPaymentUpdate(!showPaymentUpdate)}
            style={{
              backgroundColor: "var(--primary-color)",
              color: "white",
              border: "none",
              padding: "10px 20px",
              borderRadius: "25px",
              cursor: "pointer",
              fontSize: "16px",
              fontWeight: "bold",
              width: "180px",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
            }}>
            {showPaymentUpdate ? (
              <FaTimes style={{ paddingRight: 5 }} />
            ) : (
              <FaCreditCard style={{ paddingRight: 5 }} />
            )}
            {showPaymentUpdate ? "Cancel" : "Update"}
          </button>
        </div>

        {showPaymentUpdate && (
          <form
            onSubmit={handleUpdatePaymentMethod}
            style={{ marginTop: "20px" }}>
            <CardElement
              options={{
                style: {
                  base: {
                    fontSize: "16px",
                    color: "#424770",
                    "::placeholder": { color: "#aab7c4" },
                  },
                },
              }}
            />
            <button
              type="submit"
              disabled={!stripe}
              style={{
                marginTop: "20px",
                backgroundColor: "var(--primary-color)",
                color: "white",
                border: "none",
                padding: "10px 15px",
                borderRadius: "25px",
                cursor: "pointer",
              }}>
              Update Payment Method
            </button>
          </form>
        )}

        {paymentUpdateError && (
          <div style={{ color: "red", marginTop: "10px" }}>
            {paymentUpdateError}
          </div>
        )}

        {paymentUpdateSuccess && (
          <div style={{ color: "green", marginTop: "10px" }}>
            Payment method updated successfully!
          </div>
        )}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "15px 0",
            borderBottom: "1px solid rgba(0, 0, 0, 0.1)",
          }}>
          <span style={{ fontSize: "1.1em", color: "var(--text-color)" }}>
            Close Account
          </span>
          <Link
            to="/close-account"
            className="btn"
            style={{
              backgroundColor: "#ff6b6b", // A softer red color
              color: "white",
              border: "none",
              padding: "10px 15px",
              borderRadius: "25px",
              textDecoration: "none",
              display: "flex",
              alignItems: "center",
            }}>
            <FaTimes style={{ marginRight: "5px" }} /> Close Account
          </Link>
        </div>
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

      <InfoModal
        isOpen={isInfoModalOpen}
        onClose={() => setIsInfoModalOpen(false)}
        message={infoModalMessage}
      />
    </div>
  );
};

export default Profile;
