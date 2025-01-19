import React, { useState, useEffect } from "react";
import {
  FaArrowLeft,
  FaArrowRight,
  FaPlay,
  FaPause,
  FaRedo,
} from "react-icons/fa";
import { useTimer } from "../../hooks/useTimer";

interface InstructionStepProps {
  instruction: string;
  stepNumber: number;
  totalSteps: number;
  onNext: () => void;
  onPrevious: () => void;
}

const InstructionStep: React.FC<InstructionStepProps> = ({
  instruction,
  stepNumber,
  totalSteps,
  onNext,
  onPrevious,
}) => {
  // Timer state management
  const [timerDuration, setTimerDuration] = useState<number | null>(null);
  const [isTimer, setIsTimer] = useState(false);
  const { timeLeft, isActive, startTimer, pauseTimer, resetTimer, playBeep } =
    useTimer(() => {
      playBeep();
    });

  // Parse instruction for timing information when component mounts or instruction changes
  useEffect(() => {
    // Reset timer states when instruction changes
    setIsTimer(false);
    setTimerDuration(null);
    resetTimer(0);

    // Parse new instruction for timing information
    const timeInfo = parseTimeFromInstruction(instruction);

    if (timeInfo) {
      const newDuration = timeInfo.minTime;
      setTimerDuration(newDuration);
      resetTimer(newDuration);
      setIsTimer(true);
    }
  }, [instruction]); // Only depend on instruction changes

  // Function to parse time information from instruction text
  const parseTimeFromInstruction = (text: string) => {
    // Match patterns like "2-3 minutes" or "30 seconds"
    const timeRegex =
      /(\d+)(?:-(\d+))?\s*(minutes?|mins?|seconds?|secs?|hours?|hrs?)/i;
    const match = text.match(timeRegex);

    if (match) {
      const minTime = parseInt(match[1]);
      const unit = match[3].toLowerCase();

      // Convert to seconds
      let seconds = minTime;
      if (unit.startsWith("hour")) seconds *= 3600;
      else if (unit.startsWith("min")) seconds *= 60;

      return {
        minTime: seconds,
      };
    }
    return null;
  };

  // Format seconds into mm:ss display
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const renderInstruction = (text: string) => {
    // Check if text is wrapped in stars
    const isHeader = text.startsWith("**") && text.endsWith("**");

    if (isHeader) {
      // Remove stars
      const headerText = text.slice(2, -2);
      return (
        <h1 className="instruction-header" style={{ color: "#a1c800" }}>
          {headerText}
        </h1>
      );
    }

    return <p className="instruction-text">{text}</p>;
  };

  // Handle timer reset
  const handleResetTimer = () => {
    if (timerDuration !== null) {
      resetTimer(timerDuration);
    }
  };

  // Handle timer start/pause
  const handleTimerToggle = () => {
    if (timerDuration === null) return;

    if (isActive) {
      pauseTimer();
    } else {
      startTimer(timerDuration);
    }
  };

  return (
    <div className="recipe-result">
      <p className="step-counter">
        Step {stepNumber} of {totalSteps}
      </p>
      {/* Navigation header */}
      <div className="instruction-nav">
        <button
          onClick={onPrevious}
          disabled={stepNumber === 1}
          className="recipe-action-button back-button-orange">
          <FaArrowLeft className="button-icon" />
        </button>
        <button
          onClick={onNext}
          className="recipe-action-button back-button-orange">
          <FaArrowRight className="button-icon" />
        </button>
      </div>

      {/* Instruction display */}
      <div className="recipe-section">
        {renderInstruction(instruction)}

        {/* Timer section */}
        {isTimer && timerDuration !== null && (
          <div className="timer-container">
            <div className="timer-content">
              <div className="timer-display">
                {formatTime(timeLeft || timerDuration)}
              </div>

              <div className="timer-controls">
                <button
                  onClick={handleTimerToggle}
                  className="recipe-action-button">
                  {isActive ? <FaPause /> : <FaPlay />}
                </button>
                <button
                  onClick={handleResetTimer}
                  className="recipe-action-button">
                  <FaRedo />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default InstructionStep;
