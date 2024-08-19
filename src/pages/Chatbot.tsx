import React, { useState, useEffect, useRef } from "react";
import { FaPaperPlane, FaTimes } from "react-icons/fa";
import Select, { MultiValue } from "react-select";
import {
  getRecommendation,
  getFriends,
  getProfile,
  getRemainingPrompts,
  updatePromptCount,
} from "../utils/api";
import { useAuth } from "../context/AuthContext";
import FormattedAIResponse from "../components/chatbot/FormattedAiResponse";
import { Message, PaymentTier, User } from "../types";
import AnimatedTechIcon from "../components/common/AnimatedTechIcon";
import "../styles/chatbot.css";

interface FriendOption {
  value: number;
  label: string;
}

const getInitials = (name: string) => {
  return name
    .split(" ")
    .map((word) => word[0])
    .join("")
    .toUpperCase();
};

const Chatbot: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      text: "Hey there! Lets discover some new interests together! Ask me about some places you'd like to travel, resturants you'd enjoy, or even some new things to check out on your streaming service of choice. Ask me anything at all and I will look at your profile and give you personalized recommendations that I am confident you will enjoy. Use me as a stepping stone for new discoveries!",
      sender: "ai",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedFriends, setSelectedFriends] = useState<number[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const { isAuthenticated } = useAuth();

  const [friendOptions, setFriendOptions] = useState<FriendOption[]>([]);
  const [selectedFriendOptions, setSelectedFriendOptions] = useState<
    FriendOption[]
  >([]);
  const [remainingPrompts, setRemainingPrompts] = useState<
    number | "Unlimited"
  >(0);

  const promptsAreLimited =
    currentUser &&
    [PaymentTier.Free, PaymentTier.Basic].includes(
      PaymentTier[
        currentUser.payment_tier as unknown as keyof typeof PaymentTier
      ]
    );

  const fetchRemainingPrompts = async () => {
    try {
      const response = await getRemainingPrompts();
      setRemainingPrompts(response.data.remaining);
    } catch (error) {
      console.error("Error fetching remaining prompts:", error);
    }
  };

  useEffect(() => {
    fetchRemainingPrompts();
  }, []);

  useEffect(() => {
    const fetchUserAndFriends = async () => {
      if (isAuthenticated) {
        try {
          const userResponse = await getProfile();
          setCurrentUser(userResponse.data);

          const friendsResponse = await getFriends();
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
        if (promptsAreLimited) {
          await updatePromptCount();
          await fetchRemainingPrompts();
        }
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

  return (
    <div className="chatbot-container">
      <div className="chatbot-header">
        <h1 className="chatbot-title">
          <AnimatedTechIcon size={50} speed={3} /> VibeQuest AI
        </h1>
        {canUseFriendSelection && (
          <div className="friend-selection">
            <Select
              isMulti
              options={friendOptions}
              value={selectedFriendOptions}
              onChange={handleFriendSelection}
              placeholder="Select friends..."
            />
            <div className="selected-friends">
              {selectedFriendOptions.map((friend) => (
                <span key={friend.value} className="selected-friend">
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
      <p
        style={{
          marginBottom: "20px",
          color: "var(--text-color)",
          fontSize: "0.5em",
        }}>
        <strong>Disclaimer:</strong> AI responses can at times provide
        unpredictable or inaccurate results. We are continuously working on
        updating and improving the model and inaccuracies will become less
        apparent over time but will probably never go away entirely.
      </p>
      <div className="chatbot-messages">
        <div ref={messagesContainerRef} className="messages-container">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`message ${
                message.sender === "user" ? "user-message" : "ai-message"
              }`}>
              <div className="message-content">
                <div>
                  {message.sender === "ai" ? (
                    <FormattedAIResponse response={message.text} />
                  ) : (
                    <div style={{ fontSize: "0.8em" }}>{message.text}</div>
                  )}
                  <div className="message-timestamp">
                    {message.timestamp.toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                </div>
                {message.sender === "user" &&
                  currentUser &&
                  (currentUser.avatar ? (
                    <img
                      src={currentUser.avatar}
                      alt={currentUser.name}
                      className="user-avatar"
                    />
                  ) : (
                    <div className="user-avatar">
                      {getInitials(currentUser.name)}
                    </div>
                  ))}
              </div>
            </div>
          ))}
          {isLoading && <AnimatedTechIcon size={100} speed={10} />}
        </div>
        <div className="input-container">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && handleSend()}
            disabled={isLoading || remainingPrompts === 0}
            placeholder="Type your message..."
            className="message-input"
          />
          <button
            onClick={handleSend}
            disabled={isLoading || remainingPrompts === 0}
            className="send-button"
            onMouseEnter={(e) =>
              (e.currentTarget.style.transform = "scale(1.1)")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.transform = "scale(1)")
            }>
            <FaPaperPlane color="white" />
          </button>
        </div>
        <div className="remaining-prompts">
          {Number(remainingPrompts) === 0 &&
          remainingPrompts !== "Unlimited" ? (
            <p style={{ color: "red" }}>Out of prompts for today</p>
          ) : (
            <p>
              Remaining prompts today:{" "}
              {remainingPrompts === "Unlimited"
                ? "Unlimited"
                : remainingPrompts}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Chatbot;
