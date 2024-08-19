import React, { createContext, useState, useContext, ReactNode } from "react";

interface TutorialContextType {
  isTutorialActive: boolean;
  currentStep: number;
  startTutorial: () => void;
  endTutorial: () => void;
  nextStep: () => void;
  prevStep: () => void;
}

const TutorialContext = createContext<TutorialContextType | undefined>(
  undefined
);

export const TutorialProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [isTutorialActive, setIsTutorialActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  const startTutorial = () => {
    setIsTutorialActive(true);
  };

  const endTutorial = () => {
    setIsTutorialActive(false);
    setCurrentStep(0);
  };

  const nextStep = () => setCurrentStep((prev) => prev + 1);
  const prevStep = () => setCurrentStep((prev) => Math.max(0, prev - 1));

  return (
    <TutorialContext.Provider
      value={{
        isTutorialActive,
        currentStep,
        startTutorial,
        endTutorial,
        nextStep,
        prevStep,
      }}>
      {children}
    </TutorialContext.Provider>
  );
};

export const useTutorial = () => {
  const context = useContext(TutorialContext);
  if (context === undefined) {
    throw new Error("useTutorial must be used within a TutorialProvider");
  }
  return context;
};
