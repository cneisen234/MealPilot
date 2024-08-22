import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FaArrowRight, FaInfoCircle, FaPlus, FaTimes } from "react-icons/fa";
import { useAuth } from "../../context/AuthContext";
import {
  getProfile,
  updateProfile,
  addInterestCategory,
  addItemToCategory,
} from "../../utils/api";
import { User, Interest, PrivacySetting } from "../../types";
import { motion, AnimatePresence } from "framer-motion";
import "../../styles/onboarding.css";
import StarRating from "../profile/StarRating";
import AnimatedTechIcon from "../common/AnimatedTechIcon";

const MAX_CATEGORIES = 3;
const MAX_ITEMS_PER_CATEGORY = 5;

const Onboarding: React.FC = () => {
  const [step, setStep] = useState(0);
  const [user, setUser] = useState<User | null>(null);
  const [bio, setBio] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [categories, setCategories] = useState<string[]>([]);
  const [items, setItems] = useState<{
    [category: string]: { name: string; rating: number }[];
  }>({});
  const [newCategory, setNewCategory] = useState("");
  const [newItems, setNewItems] = useState<{
    [category: string]: { name: string; rating: number };
  }>({});
  const [showLimitMessage, setShowLimitMessage] = useState(false);
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const response = await getProfile();
        setUser(response.data);
        setBio(response.data.bio || "");
        setCity(response.data.city || "");
        setState(response.data.state || "");
      } catch (error) {
        console.error("Error fetching user profile:", error);
      }
    };

    if (isAuthenticated) {
      fetchUserProfile();
    }
  }, [isAuthenticated]);

  const introSteps = [
    "Hi there!",
    "Welcome to VibeQuest",
    "Introducing Lena AI",
    "She's your guide to discovering new interests!",
    "Let's get started!",
  ];

  useEffect(() => {
    if (step < introSteps.length) {
      const timer = setTimeout(() => {
        setStep((prevStep) => prevStep + 1);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [step, introSteps.length]);

  const handleNext = async () => {
    const currentStep = step - introSteps.length;

    if (currentStep === 0) {
      // Save bio
      await updateProfile(user!.id, { ...user!, bio });
    } else if (currentStep === 1) {
      // Save city and state
      await updateProfile(user!.id, { ...user!, city, state });
    }

    setStep((prevStep) => prevStep + 1);
  };

  const addCategory = () => {
    if (newCategory.trim() && categories.length < MAX_CATEGORIES) {
      setCategories([...categories, newCategory.trim()]);
      setNewCategory("");
      setShowLimitMessage(false);
    } else if (categories.length >= MAX_CATEGORIES) {
      setShowLimitMessage(true);
    }
  };

  const removeCategory = (categoryToRemove: string) => {
    setCategories(
      categories.filter((category) => category !== categoryToRemove)
    );
    setItems((prevItems) => {
      const newItems = { ...prevItems };
      delete newItems[categoryToRemove];
      return newItems;
    });
  };

  const addItem = (category: string) => {
    if (newItems[category] && newItems[category].name.trim()) {
      if ((items[category]?.length || 0) < MAX_ITEMS_PER_CATEGORY) {
        setItems((prevItems) => ({
          ...prevItems,
          [category]: [...(prevItems[category] || []), newItems[category]],
        }));
        setNewItems((prev) => ({
          ...prev,
          [category]: { name: "", rating: 5 },
        }));
        setShowLimitMessage(false);
      } else {
        setShowLimitMessage(true);
      }
    }
  };

  const removeItem = (category: string, itemToRemove: string) => {
    setItems((prevItems) => ({
      ...prevItems,
      [category]: prevItems[category].filter(
        (item) => item.name !== itemToRemove
      ),
    }));
  };

  const areAllItemsRanked = () => {
    return Object.values(items).every((categoryItems) =>
      categoryItems.every((item) => item.rating > 0)
    );
  };

  const finishOnboarding = async () => {
    if (!user) return;

    try {
      for (const category of categories) {
        const newInterest: Omit<Interest, "id"> = {
          userId: user.id,
          category,
          visibility: PrivacySetting.Public,
          items: [],
        };

        const createdInterest = await addInterestCategory(newInterest);

        if (items[category]) {
          for (const item of items[category]) {
            await addItemToCategory(createdInterest.id, item);
          }
        }
      }

      navigate("/profile", { state: { fromOnboarding: true } });
    } catch (error) {
      console.error("Error updating profile:", error);
    }
  };

  const renderStep = () => {
    if (step < introSteps.length) {
      return (
        <motion.div
          key={step}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          className="intro-step">
          <h2>{introSteps[step]}</h2>
        </motion.div>
      );
    }

    switch (step - introSteps.length) {
      case 0:
        return (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="onboarding-step">
            <h2>Tell us about yourself</h2>
            <p>
              Tell Lena about yourself! The more she knows about you, the better
              she can suggest cool stuff you'll love. What makes you, well...
              you?
            </p>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="I'm a coffee enthusiast who loves to travel..."
              rows={4}
              className="bio-input"
              maxLength={255}
            />
            <p className="char-count">{bio.length}/255 characters</p>
          </motion.div>
        );
      case 1:
        return (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="onboarding-step">
            <h2>Where are you based?</h2>
            <p>
              Your location helps Lena recommend local activities, events, and
              interests tailored to your area.
            </p>
            <div className="input-group">
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="City"
                className="location-input"
              />
            </div>
            <div className="input-group">
              <input
                type="text"
                value={state}
                onChange={(e) => setState(e.target.value)}
                placeholder="State"
                className="location-input"
              />
            </div>
          </motion.div>
        );
      case 2:
        return (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="onboarding-step">
            <h2>What are you passionate about?</h2>
            <p>
              Share your interests with Lena! She'll use these as a starting
              point to suggest new, exciting activities based on your answers.
            </p>
            <div className="input-group">
              <input
                type="text"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                maxLength={50}
                placeholder="E.g., Travel, Coffee, Photography"
                className="category-input"
              />
              <button
                onClick={addCategory}
                className="add-button"
                disabled={categories.length >= MAX_CATEGORIES}>
                <FaPlus /> Add
              </button>
            </div>
            <div className="categories-list">
              {categories.map((cat, index) => (
                <span key={index} className="category-tag">
                  {cat}
                  <button
                    onClick={() => removeCategory(cat)}
                    className="remove-button">
                    <FaTimes />
                  </button>
                </span>
              ))}
            </div>
            {showLimitMessage && (
              <p className="limit-message">
                <FaInfoCircle /> You've reached the limit for free users.
                Upgrade to add more!
              </p>
            )}
            <p className="category-count">
              {categories.length} / {MAX_CATEGORIES} categories added
            </p>
          </motion.div>
        );
      case 3:
        return (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="onboarding-step">
            <h2>Let's dive deeper!</h2>
            <p>
              What kind of things do you enjoy about these? The more details you
              give, the more Lena will understand you.
            </p>
            {categories.map((cat, index) => (
              <div key={index} className="category-items">
                <div className="category-header">
                  <h3 className="category-name">{cat}</h3>
                  <span className="item-count">
                    {items[cat]?.length || 0} / {MAX_ITEMS_PER_CATEGORY} items
                  </span>
                </div>
                <div className="input-group">
                  <input
                    type="text"
                    value={newItems[cat]?.name || ""}
                    onChange={(e) =>
                      setNewItems((prev) => ({
                        ...prev,
                        [cat]: { ...prev[cat], name: e.target.value },
                      }))
                    }
                    maxLength={100}
                    placeholder={`Add an item to ${cat}`}
                    className="item-input"
                  />

                  <button
                    onClick={() => addItem(cat)}
                    className="add-button"
                    disabled={
                      (items[cat]?.length || 0) >= MAX_ITEMS_PER_CATEGORY
                    }>
                    <FaPlus /> Add
                  </button>
                </div>

                {items[cat] &&
                  items[cat].map((item, itemIndex) => (
                    <div key={itemIndex} className="item-rating">
                      <span>{item.name}</span>
                      <StarRating
                        rating={item.rating}
                        onRatingChange={(newRating) => {
                          const newItems = { ...items };
                          newItems[cat][itemIndex].rating = newRating;
                          setItems(newItems);
                        }}
                      />
                      <button
                        onClick={() => removeItem(cat, item.name)}
                        className="remove-button">
                        <FaTimes />
                      </button>
                    </div>
                  ))}
              </div>
            ))}
            {showLimitMessage && (
              <p className="limit-message">
                <FaInfoCircle /> You've reached the item limit for this
                category. Upgrade to add more!
              </p>
            )}
          </motion.div>
        );
      default:
        return null;
    }
  };

  const hasAddedItems = Object.values(items).some(
    (categoryItems) => categoryItems.length > 0
  );

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
    <div className="onboarding-container">
      <div className="onboarding-content">
        <AnimatePresence mode="wait">{renderStep()}</AnimatePresence>
      </div>
      {step === introSteps.length + 3 && (
        <p style={{ margin: 0, fontSize: 12 }}>
          Each item must be rated to proceed
        </p>
      )}
      <div className="onboarding-actions">
        {step >= introSteps.length && (
          <button
            onClick={
              step === introSteps.length + 3 ? finishOnboarding : handleNext
            }
            className="next-button"
            disabled={
              (step === introSteps.length && !bio.trim()) ||
              (step === introSteps.length + 1 &&
                (!city.trim() || !state.trim())) ||
              (step === introSteps.length + 2 && categories.length === 0) ||
              (step === introSteps.length + 3 && !hasAddedItems) ||
              !areAllItemsRanked()
            }>
            {step === introSteps.length + 3 ? "Finish" : "Next"}{" "}
            <FaArrowRight />
          </button>
        )}
      </div>
    </div>
  );
};

export default Onboarding;
