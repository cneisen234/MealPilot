import React, { useEffect, useCallback } from "react";
import { FaMicrophone } from "react-icons/fa";
import SpeechRecognition, {
  useSpeechRecognition,
} from "react-speech-recognition";

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
              {currentTranscript}
            </div>
          )}
        </div>

        <button
          onClick={onClose}
          className="submit-button"
          style={{ width: "100%", marginTop: "20px" }}>
          Stop Listening
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
  const {
    transcript,
    listening,
    resetTranscript,
    browserSupportsSpeechRecognition,
  } = useSpeechRecognition();

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

  // Process results when speech recognition stops
  useEffect(() => {
    if (!listening && transcript) {
      findMatches(transcript);
      resetTranscript();
    } else {
      findMatches("");
    }
  }, [listening, transcript, findMatches, resetTranscript]);

  if (!browserSupportsSpeechRecognition) {
    return null;
  }

  const toggleListening = () => {
    if (listening) {
      SpeechRecognition.stopListening();
    } else {
      resetTranscript();
      SpeechRecognition.startListening();
    }
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

      {listening && (
        <SpeechRecognitionModal
          currentTranscript={transcript}
          onClose={() => SpeechRecognition.stopListening()}
        />
      )}
    </>
  );
};

export default SpeechRecognitionComponent;
