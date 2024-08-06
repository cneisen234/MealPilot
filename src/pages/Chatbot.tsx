// src/pages/Chatbot.tsx
import React, { useState, useEffect, useRef } from "react";
import { FaPaperPlane, FaRobot, FaUser } from "react-icons/fa";

interface Message {
  id: number;
  text: string;
  sender: "user" | "ai";
  timestamp: Date;
}

const Chatbot: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      text: "Hello! How can I assist you today?",
      sender: "ai",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    if (messagesContainerRef.current) {
      const { scrollHeight, clientHeight } = messagesContainerRef.current;
      if (scrollHeight > clientHeight) {
        messagesContainerRef.current.scrollTop = scrollHeight - clientHeight;
      }
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = () => {
    if (input.trim()) {
      const newMessage: Message = {
        id: messages.length + 1,
        text: input.trim(),
        sender: "user",
        timestamp: new Date(),
      };
      setMessages([...messages, newMessage]);
      setInput("");

      // Simulate AI response
      setTimeout(() => {
        const aiResponse: Message = {
          id: messages.length + 2,
          text: "I'm processing your request. How else can I help you?",
          sender: "ai",
          timestamp: new Date(),
        };
        setMessages((prevMessages) => [...prevMessages, aiResponse]);
      }, 1000);
    }
  };

  return (
    <div
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        padding: "20px",
        boxSizing: "border-box",
      }}>
      <h1 style={{ marginBottom: "20px", color: "var(--primary-color)" }}>
        AI Assistant
      </h1>
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          background: "var(--surface-color)",
          borderRadius: "15px",
          boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
          overflow: "hidden",
        }}>
        <div
          ref={messagesContainerRef}
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "20px",
          }}>
          {messages.map((message) => (
            <div
              key={message.id}
              style={{
                display: "flex",
                justifyContent:
                  message.sender === "user" ? "flex-end" : "flex-start",
                marginBottom: "15px",
              }}>
              <div
                style={{
                  maxWidth: "70%",
                  padding: "10px 15px",
                  borderRadius:
                    message.sender === "user"
                      ? "20px 20px 0 20px"
                      : "20px 20px 20px 0",
                  background:
                    message.sender === "user"
                      ? "var(--primary-color)"
                      : "rgba(150, 111, 214, 0.1)",
                  color:
                    message.sender === "user" ? "white" : "var(--text-color)",
                  display: "flex",
                  alignItems: "center",
                }}>
                {message.sender === "ai" && (
                  <FaRobot
                    style={{
                      marginRight: "10px",
                      fontSize: "1.2em",
                      color: "var(--primary-color)",
                    }}
                  />
                )}
                <div>
                  <div>{message.text}</div>
                  <div
                    style={{
                      fontSize: "0.7em",
                      marginTop: "5px",
                      opacity: 0.7,
                    }}>
                    {message.timestamp.toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                </div>
                {message.sender === "user" && (
                  <FaUser style={{ marginLeft: "10px", fontSize: "1.2em" }} />
                )}
              </div>
            </div>
          ))}
        </div>
        <div
          style={{
            display: "flex",
            padding: "15px",
            borderTop: "1px solid rgba(0, 0, 0, 0.1)",
          }}>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && handleSend()}
            placeholder="Type your message..."
            style={{
              flex: 1,
              border: "none",
              padding: "10px 15px",
              borderRadius: "25px",
              fontSize: "16px",
              outline: "none",
              backgroundColor: "rgba(150, 111, 214, 0.1)",
            }}
          />
          <button
            onClick={handleSend}
            style={{
              background: "var(--primary-color)",
              border: "none",
              borderRadius: "50%",
              width: "40px",
              height: "40px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginLeft: "10px",
              cursor: "pointer",
              transition: "all 0.3s ease",
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.transform = "scale(1.1)")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.transform = "scale(1)")
            }>
            <FaPaperPlane color="white" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default Chatbot;
