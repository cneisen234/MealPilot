import React, { useCallback, useState } from "react";
import { FaMicrophone } from "react-icons/fa";
import SpeechRecognition, {
  useSpeechRecognition,
} from "react-speech-recognition";
import { incrementAchievement } from "../../utils/api";
import { useToast } from "../../context/ToastContext";

interface SpeechRecognitionProps {
  items: Array<{ id: number; item_name: string }>;
  onMatches: (matches: Array<{ id: number; item_name: string }>) => void;
  onNoMatch: (spokenText: string) => void;
  setNewItemFromPhoto: (text: string) => void;
}

const SpeechRecognitionModal = ({
  currentTranscript,
  onClose,
}: {
  currentTranscript: string;
  onClose: () => void;
}) => {
  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: "400px" }}>
        <div className="modal-header-form" style={{ marginBottom: "40px" }}>
          <h2>Listening for Voice Input</h2>
        </div>

        <div
          style={{
            backgroundColor: "rgba(5, 71, 42, 0.1)",
            padding: "12px 20px",
            borderRadius: "8px",
            marginTop: "-22px",
            fontSize: "0.9rem",
            color: "var(--text-color)",
            maxWidth: "850px",
            margin: "20px auto",
          }}>
          NOTE: Ensure your browser has access to your device's microphone.
        </div>

        <div style={{ textAlign: "center", marginBottom: "30px" }}>
          <FaMicrophone
            size={48}
            style={{
              color: "var(--primary-color)",
              marginBottom: "20px",
              animation: "glow 1.5s ease-in-out infinite alternate",
            }}
          />
          <div className="listening-dots">
            <div className="listening-dot"></div>
            <div className="listening-dot"></div>
            <div className="listening-dot"></div>
          </div>
          {currentTranscript && (
            <div
              style={{
                marginTop: "20px",
                padding: "10px",
                backgroundColor: "rgba(5, 71, 42, 0.1)",
                borderRadius: "8px",
                color: "var(--text-color)",
              }}>
              Transcription Done!
            </div>
          )}
        </div>

        <button
          onClick={onClose}
          className="submit-button"
          style={{ width: "100%", marginTop: "20px" }}>
          Results
        </button>
      </div>
    </div>
  );
};

const SpeechRecognitionComponent: React.FC<SpeechRecognitionProps> = ({
  items,
  onMatches,
  onNoMatch,
  setNewItemFromPhoto,
}) => {
  const { transcript, resetTranscript, browserSupportsSpeechRecognition } =
    useSpeechRecognition();

  // Custom state to manage listening control
  const [isListening, setIsListening] = useState(false);
  const { showToast } = useToast();

  const findMatches = useCallback(
    (spokenText: string) => {
      if (!spokenText.trim()) return;

      const words = spokenText.toLowerCase().split(" ");
      const matches = items.filter((item) => {
        const itemWords = item.item_name.toLowerCase().split(" ");
        return words.some((word) =>
          itemWords.some(
            (itemWord) => itemWord.includes(word) || word.includes(itemWord)
          )
        );
      });

      if (matches.length > 0) {
        setNewItemFromPhoto(spokenText.trim());
        onMatches(matches); // Keep matches the same
      } else {
        onNoMatch(spokenText.trim());
      }
    },
    [items, onMatches, onNoMatch]
  );

  if (!browserSupportsSpeechRecognition) {
    return null;
  }

  // Start listening manually
  const toggleListening = () => {
    if (isListening) {
      SpeechRecognition.stopListening();
    } else {
      SpeechRecognition.startListening();
    }
    setIsListening((prev) => !prev);
  };

  const handleOnClose = async () => {
    const result = await incrementAchievement("items_voice_added");
    if (result.toast) {
      showToast(result.toast.message, "info");
    }
    findMatches(transcript);
    resetTranscript();
    setIsListening(false); // Stop manually when closing
    SpeechRecognition.stopListening();
  };

  return (
    <>
      <button
        onClick={toggleListening}
        className="add-item-button-list"
        style={{ backgroundColor: "var(--secondary-color)" }}>
        <FaMicrophone className="microphone-icon" />
        <span>Add/Edit by Voice</span>
      </button>

      {isListening && (
        <SpeechRecognitionModal
          currentTranscript={transcript}
          onClose={handleOnClose}
        />
      )}
    </>
  );
};

export default SpeechRecognitionComponent;
