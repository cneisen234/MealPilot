import React from "react";
import { useNavigate } from "react-router-dom";
import Modal from "./TutorialModal";
import { FaArrowRight } from "react-icons/fa";
import { useTutorial } from "../../context/TutorialContext";
import "../../styles/newusertutorial.css";

const NewUserTutorial: React.FC = () => {
  const { isTutorialActive, currentStep, endTutorial, nextStep } =
    useTutorial();
  const navigate = useNavigate();

  const steps = [
    {
      title: "Welcome to VibeQuest!",
      content: "Would you like a brief tutorial to get started?",
      buttons: [
        { text: "No, thanks", onClick: endTutorial },
        { text: "Yes, show me around", onClick: nextStep },
      ],
    },
    {
      title: "Chat with Lena",
      content:
        "Ask Lena anything about your interests or for recommendations. She'll use your bio, location, and interests from your profile page to give personalized suggestions.",
      onClick: nextStep,
    },
    {
      title: "Explore Your Interests",
      content:
        "Use the sidebar to navigate to your profile and add more interests. The more Lena knows about you, the better her recommendations will be!",
      onClick: () => {
        navigate("/profile");
        nextStep();
      },
    },
    {
      title: "Your Bio",
      content:
        "Your bio helps Lena understand you better. The more information you provide (up to 255 characters), the more personalized your recommendations will be.",
      onClick: nextStep,
    },
    {
      title: "Your Location",
      content:
        "We use your location to provide relevant recommendations. This is pulled from your device's geolocation or your profile settings if geolocation is off.",
      onClick: nextStep,
    },
    {
      title: "Interest Categories",
      content:
        "Free users can create 3 categories with 5 items each. Upgrade for more! These are crucial for Lena to provide you with solid recommendations, so be thorough.",
      onClick: () => {
        navigate("/upgrade");
        nextStep();
      },
    },
    {
      title: "Upgrade Your Experience",
      content:
        "Upgrade to add friends, get daily recommendations, more prompts, and expand your interest list for even better results from Lena!",
      onClick: () => {
        navigate("/contact-us");
        nextStep();
      },
    },
    {
      title: "Get in Touch",
      content:
        "Use this form to contact us directly with any questions, feedback, or feature requests. We're always improving!",
      onClick: () => {
        navigate("/chatbot");
        nextStep();
      },
    },
    {
      title: "You're All Set!",
      content:
        "Thanks for taking the tour. We hope you enjoy using VibeQuest. Happy exploring!",
      onClick: endTutorial,
    },
  ];

  if (!isTutorialActive) return null;

  const currentStepData = steps[currentStep];

  const handleStepAction = (e: React.MouseEvent) => {
    e.preventDefault();
    if (currentStepData.onClick) {
      currentStepData.onClick();
    } else {
      nextStep();
    }
  };

  return (
    <Modal isOpen={isTutorialActive} onClose={endTutorial}>
      <div className="tutorial-content">
        <h2 className="tutorial-title">{currentStepData.title}</h2>
        <p className="tutorial-text">{currentStepData.content}</p>
        {currentStep === 0 ? (
          <div className="button-group">
            <button onClick={endTutorial} className="tutorial-button">
              No, thanks
            </button>
            <button onClick={nextStep} className="tutorial-button">
              Yes, show me around
            </button>
          </div>
        ) : (
          <button onClick={handleStepAction} className="tutorial-button">
            {currentStep < steps.length - 1 ? (
              <>
                Next <FaArrowRight className="button-icon" />
              </>
            ) : (
              "Finish"
            )}
          </button>
        )}
      </div>
    </Modal>
  );
};

export default NewUserTutorial;
