import React, { useState, useEffect, useRef } from "react";
import {
  FaPaperPlane,
  FaRobot,
  FaTimes,
  FaUser,
  FaUserFriends,
} from "react-icons/fa";
import Select, { MultiValue } from "react-select";
import { getRecommendation, getFriends, getProfile } from "../utils/api";
import { useAuth } from "../context/AuthContext";
import Loading from "../components/Loading";
import FormattedAIResponse from "../components/FormattedAiResponse";
import { Message, PaymentTier, User } from "../types";

interface FriendOption {
  value: number;
  label: string;
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
  const [isLoading, setIsLoading] = useState(false);
  const [friends, setFriends] = useState<User[]>([]);
  const [selectedFriends, setSelectedFriends] = useState<number[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const { isAuthenticated } = useAuth();

  const [friendOptions, setFriendOptions] = useState<FriendOption[]>([]);
  const [selectedFriendOptions, setSelectedFriendOptions] = useState<
    FriendOption[]
  >([]);

  useEffect(() => {
    const fetchUserAndFriends = async () => {
      if (isAuthenticated) {
        try {
          const userResponse = await getProfile();
          setCurrentUser(userResponse.data);

          const friendsResponse = await getFriends();
          setFriends(friendsResponse.data);
          setFriendOptions(
            friendsResponse.data.map((friend: User) => ({
              value: friend.id,
              label: friend.name,
            }))
          );
        } catch (error) {
          console.error("Error fetching user data or friends:", error);
        }
      }
    };

    fetchUserAndFriends();
  }, [isAuthenticated]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    if (messagesContainerRef.current) {
      const { scrollHeight, clientHeight } = messagesContainerRef.current;
      messagesContainerRef.current.scrollTop = scrollHeight - clientHeight;
    }
  };

  const handleSend = async () => {
    if (input.trim()) {
      const userMessage: Message = {
        id: messages.length + 1,
        text: input.trim(),
        sender: "user",
        timestamp: new Date(),
      };
      setMessages([...messages, userMessage]);
      setInput("");
      setIsLoading(true);

      try {
        // Extract friend IDs from selectedFriends
        const friendIds =
          selectedFriends.length > 0 ? selectedFriends : undefined;

        // Pass both the input and friendIds to getRecommendation
        const response = await getRecommendation(input.trim(), friendIds);
        const aiMessage: Message = {
          id: messages.length + 2,
          text: response.data.recommendation,
          sender: "ai",
          timestamp: new Date(),
        };
        setMessages((prevMessages) => [...prevMessages, aiMessage]);
      } catch (error) {
        console.error("Error getting recommendation:", error);
        const errorMessage: Message = {
          id: messages.length + 2,
          text: "I'm sorry, I encountered an error while processing your request. Please try again later.",
          sender: "ai",
          timestamp: new Date(),
        };
        setMessages((prevMessages) => [...prevMessages, errorMessage]);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleFriendSelection = (selectedOptions: MultiValue<FriendOption>) => {
    setSelectedFriendOptions(selectedOptions as FriendOption[]);
    setSelectedFriends(
      selectedOptions.map((option: { value: any }) => option.value)
    );
  };

  const removeSelectedFriend = (friendId: number) => {
    setSelectedFriendOptions((prev) =>
      prev.filter((option) => option.value !== friendId)
    );
    setSelectedFriends((prev) => prev.filter((id) => id !== friendId));
  };

  const canUseFriendSelection =
    currentUser &&
    [PaymentTier.Basic, PaymentTier.Premium, PaymentTier.Owner].includes(
      PaymentTier[
        currentUser.payment_tier as unknown as keyof typeof PaymentTier
      ]
    );

  const handleInterestAdded = () => {
    // Refresh user data or update local state as needed
    getProfile();
  };

  return (
    <div
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        padding: "20px",
      }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "20px",
        }}>
        <h1 style={{ color: "var(--primary-color)", margin: 0 }}>
          AI Assistant
        </h1>
        {canUseFriendSelection && (
          <div style={{ width: "300px" }}>
            <Select
              isMulti
              options={friendOptions}
              value={selectedFriendOptions}
              onChange={handleFriendSelection}
              placeholder="Select friends..."
            />
            <div
              style={{
                marginTop: "10px",
                display: "flex",
                flexWrap: "wrap",
                gap: "5px",
              }}>
              {selectedFriendOptions.map((friend) => (
                <span
                  key={friend.value}
                  style={{
                    background: "var(--primary-color)",
                    color: "white",
                    padding: "2px 5px",
                    borderRadius: "10px",
                    fontSize: "0.8em",
                    display: "flex",
                    alignItems: "center",
                  }}>
                  {friend.label}
                  <FaTimes
                    onClick={() => removeSelectedFriend(friend.value)}
                    style={{ marginLeft: "5px", cursor: "pointer" }}
                  />
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
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
          style={{ flex: 1, overflowY: "auto", padding: "20px" }}>
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
                  {message.sender === "ai" ? (
                    <FormattedAIResponse
                      response={message.text}
                      currentUser={currentUser!}
                      onInterestAdded={handleInterestAdded}
                    />
                  ) : (
                    <div>{message.text}</div>
                  )}
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
          {isLoading && <Loading />}
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
