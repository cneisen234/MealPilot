import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FaArrowRight, FaPlus } from "react-icons/fa";
import { useAuth } from "../../context/AuthContext";
import {
  getProfile,
  updateProfile,
  addInterestCategory,
  addItemToCategory,
  updateItemRating,
} from "../../utils/api";
import { User, Interest, PrivacySetting } from "../../types";
import { motion, AnimatePresence } from "framer-motion";
import "../../styles/onboarding.css";
import StarRating from "../profile/StarRating";
import AnimatedTechIcon from "../common/AnimatedTechIcon";

const Onboarding: React.FC = () => {
  const [step, setStep] = useState(0);
  const [user, setUser] = useState<User | null>(null);
  const [bio, setBio] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [category, setCategory] = useState("");
  const [item, setItem] = useState("");
  const [itemRating, setItemRating] = useState(5);
  const [currentCategoryId, setCurrentCategoryId] = useState<number | null>(
    null
  );
  const [currentItemId, setCurrentItemId] = useState<number | null>(null);

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
    "She'll help you find new interests!",
    "Let's get started!",
  ];

  useEffect(() => {
    if (step < introSteps.length) {
      const timer = setTimeout(() => {
        setStep((prevStep) => prevStep + 1);
      }, 3000); // Increased delay to 3 seconds
      return () => clearTimeout(timer);
    }
  }, [step, introSteps.length]);

  const handleNext = async () => {
    const currentStep = step - introSteps.length;

    if (currentStep === 0) {
      console.log(bio);
      // Save bio
      await updateProfile(user!.id, { ...user!, bio });
    } else if (currentStep === 1) {
      // Save city and state
      await updateProfile(user!.id, { ...user!, bio, city, state });
    }

    setStep((prevStep) => prevStep + 1);
  };

  const addCategory = async () => {
    if (category.trim() && user) {
      try {
        const newInterest: Omit<Interest, "id"> = {
          userId: user.id,
          category: category.trim(),
          visibility: PrivacySetting.Public,
          items: [],
        };
        const createdInterest = await addInterestCategory(newInterest);
        setCurrentCategoryId(createdInterest.id);
        handleNext();
      } catch (error) {
        console.error("Error adding category:", error);
      }
    }
  };

  const addItem = async () => {
    if (item.trim() && currentCategoryId) {
      try {
        const createdItem = await addItemToCategory(currentCategoryId, {
          name: item.trim(),
          rating: 5,
        });
        setCurrentItemId(createdItem.id);
        handleNext();
      } catch (error) {
        console.error("Error adding item:", error);
      }
    }
  };

  const rateItem = async () => {
    if (currentCategoryId && currentItemId) {
      try {
        await updateItemRating(currentCategoryId, currentItemId, itemRating);
        finishOnboarding();
      } catch (error) {
        console.error("Error updating item rating:", error);
      }
    }
  };

  const finishOnboarding = async () => {
    if (!user) return;
    setCategory("");
    setItem("");
    navigate("/chatbot", { state: { fromOnboarding: true } });
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
            <h2>Describe yourself</h2>
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
              Share an interest with Lena! She'll use this as a starting point
              to suggest new, exciting activities.
            </p>
            <div className="input-group">
              <input
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                maxLength={50}
                placeholder="E.g., Travel, Coffee, Photography"
                className="category-input"
              />
              <button onClick={addCategory} className="add-button">
                <FaPlus /> Add
              </button>
            </div>
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
              What's something specific you enjoy about {category}? The more
              details you give, the more Lena will understand you.
            </p>
            <div className="input-group">
              <input
                type="text"
                value={item}
                onChange={(e) => setItem(e.target.value)}
                maxLength={100}
                placeholder={`Add an item to ${category}`}
                className="item-input"
              />
              <button onClick={addItem} className="add-button">
                <FaPlus /> Add
              </button>
            </div>
          </motion.div>
        );
      case 4:
        return (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="onboarding-step">
            <h2>How much do you like it?</h2>
            <p>Alright! Tell Lena just how much you like {item}.</p>
            <div className="rating-container">
              <StarRating
                size={25}
                rating={itemRating}
                onRatingChange={setItemRating}
              />
            </div>
            <button
              style={{ margin: "0 auto", marginTop: 20 }}
              onClick={rateItem}
              className="next-button">
              Finish <FaArrowRight />
            </button>
          </motion.div>
        );
      default:
        return null;
    }
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
    <div className="onboarding-container">
      <div className="onboarding-content">
        <AnimatePresence mode="wait">{renderStep()}</AnimatePresence>
      </div>
      <div className="onboarding-actions">
        {step >= introSteps.length && step < introSteps.length + 2 && (
          <button
            onClick={handleNext}
            className="next-button"
            disabled={step === introSteps.length && !bio.trim()}>
            Next <FaArrowRight />
          </button>
        )}
      </div>
    </div>
  );
};

export default Onboarding;
