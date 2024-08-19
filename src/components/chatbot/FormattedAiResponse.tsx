import React, { useState, useEffect, useRef } from "react";
import { User } from "../../types";

interface FormattedAIResponseProps {
  response: string;
}

const FormattedAIResponse: React.FC<FormattedAIResponseProps> = ({
  response,
}) => {
  const [displayedText, setDisplayedText] = useState("");
  const typingSpeed = 5; // milliseconds per character
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let isMounted = true;
    let charIndex = 0;

    const typeText = () => {
      if (!isMounted) return;

      if (charIndex < response.length) {
        setDisplayedText(response.substring(0, charIndex + 1));
        charIndex++;
        setTimeout(typeText, typingSpeed);
      }
    };

    typeText();

    return () => {
      isMounted = false;
    };
  }, [response]);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [displayedText]);

  const formatText = (text: string) => {
    const paragraphs = text.split("\n\n");
    return paragraphs.map((paragraph, index) => {
      if (paragraph.startsWith("###")) {
        return (
          <h3
            key={index}
            style={{ color: "var(--primary-color)", marginBottom: "10px" }}>
            {paragraph.replace("###", "").trim()}
          </h3>
        );
      }

      const match = paragraph.match(/^(\d+)\.\s(.*?)(?:\n|$)/);
      if (match) {
        const [, number, title] = match;
        const restOfParagraph = paragraph
          .replace(/^(\d+)\.\s(.*?)(?:\n|$)/, "")
          .trim();
        return (
          <div key={index} style={{ marginBottom: "10px" }}>
            <p
              style={{
                margin: 0,
                color: "purple",
                fontWeight: "bold",
                fontSize: "0.8em",
              }}>
              {number}. {title}
            </p>
            {restOfParagraph && (
              <p style={{ fontSize: "0.8em" }}>{restOfParagraph}</p>
            )}
          </div>
        );
      }

      return (
        <p
          style={{ fontSize: "0.8em" }}
          key={index}
          dangerouslySetInnerHTML={{
            __html: paragraph.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>"),
          }}
        />
      );
    });
  };

  return (
    <div
      ref={containerRef}
      style={{
        display: "inline-block",
        position: "relative",
        maxHeight: "400px",
        overflowY: "auto",
        padding: "5px",
        backgroundColor: "var(--surface-color)",
        borderRadius: "10px",
        boxShadow: "0 2px 5px rgba(0,0,0,0.1)",
      }}>
      {formatText(displayedText)}
    </div>
  );
};

export default FormattedAIResponse;
