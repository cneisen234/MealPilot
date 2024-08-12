import React from "react";
import { User, PaymentTier } from "../types";
import { addInterestItemFromChat } from "../utils/api";

interface FormattedAIResponseProps {
  response: string;
  currentUser: User;
  onInterestAdded: () => void;
}

const FormattedAIResponse: React.FC<FormattedAIResponseProps> = ({
  response,
  currentUser,
  onInterestAdded,
}) => {
  const addInterest = async (recommendation: string) => {
    try {
      // Simple logic to extract category and item from recommendation
      const [category, item] = recommendation.split(":").map((s) => s.trim());

      await addInterestItemFromChat(currentUser.id, category, item);
      onInterestAdded();
      alert("Interest added successfully!");
    } catch (error) {
      console.error("Error adding interest:", error);
      alert("Failed to add interest. Please try again.");
    }
  };

  const canAddInterest = (category: string, item: string) => {
    const userTier =
      PaymentTier[
        currentUser.payment_tier as unknown as keyof typeof PaymentTier
      ];
    const categoryCount = currentUser.interests.length;
    const itemCount =
      currentUser.interests.find((i) => i.category === category)?.items
        .length || 0;

    switch (userTier) {
      case PaymentTier.Free:
        return categoryCount < 3 && itemCount < 5;
      case PaymentTier.Basic:
        return categoryCount < 10 && itemCount < 20;
      case PaymentTier.Premium:
      case PaymentTier.Owner:
        return categoryCount < 20 && itemCount < 50;
      default:
        return false;
    }
  };

  const formatText = (text: string) => {
    const paragraphs = text.split("\n\n");
    return paragraphs.map((paragraph, index) => {
      // Handle ### formatting
      if (paragraph.startsWith("###")) {
        return (
          <h3
            key={index}
            style={{ color: "var(--primary-color)", marginBottom: "10px" }}>
            {paragraph.replace("###", "").trim()}
          </h3>
        );
      }

      // Handle numbered points with bold text and "Add to Interests" button
      const match = paragraph.match(/^(\d+)\.\s(.+)/);
      if (match) {
        const [, number, content] = match;
        const formattedContent = content.replace(
          /\*\*(.*?)\*\*/g,
          "<strong>$1</strong>"
        );
        const [category, item] = content.split(":").map((s) => s.trim());
        const canAdd = canAddInterest(category, item);

        return (
          <div
            key={index}
            style={{
              display: "flex",
              alignItems: "center",
              marginBottom: "10px",
            }}>
            <p style={{ flex: 1 }}>
              <strong>{number}. </strong>
              <span dangerouslySetInnerHTML={{ __html: formattedContent }} />
            </p>
            {canAdd && (
              <button
                onClick={() => addInterest(content)}
                style={{
                  marginLeft: "10px",
                  padding: "5px 10px",
                  backgroundColor: "var(--primary-color)",
                  color: "white",
                  border: "none",
                  borderRadius: "5px",
                  cursor: "pointer",
                }}>
                Add to Interests
              </button>
            )}
          </div>
        );
      }

      // Handle regular paragraphs with bold text
      return (
        <p
          key={index}
          dangerouslySetInnerHTML={{
            __html: paragraph.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>"),
          }}
        />
      );
    });
  };

  return <div>{formatText(response)}</div>;
};

export default FormattedAIResponse;
