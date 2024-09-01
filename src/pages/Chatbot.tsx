import React, { useState, useEffect, useRef } from "react";
import { FaPaperPlane, FaTimes } from "react-icons/fa";
import Select, { MultiValue } from "react-select";
import {
  getRecommendation,
  getFriends,
  getProfile,
  getRemainingPrompts,
  getChatHistory,
  saveChatMessage,
  updatePromptCount,
} from "../utils/api";
import { useAuth } from "../context/AuthContext";
import FormattedAIResponse from "../components/chatbot/FormattedAiResponse";
import { Message, PaymentTier, User } from "../types";
import AnimatedTechIcon from "../components/common/AnimatedTechIcon";
import "../styles/chatbot.css";
import { useTutorial } from "../context/TutorialContext";
import { useLocation } from "react-router-dom";

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
  const { startTutorial } = useTutorial();
  const applocation = useLocation();
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedFriends, setSelectedFriends] = useState<number[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const { isAuthenticated } = useAuth();

  const [messages, setMessages] = useState<Message[]>([]);

  const [friendOptions, setFriendOptions] = useState<FriendOption[]>([]);
  const [selectedFriendOptions, setSelectedFriendOptions] = useState<
    FriendOption[]
  >([]);
  const [remainingPrompts, setRemainingPrompts] = useState<
    number | "Unlimited"
  >(0);
  const welcomeMessageRef = useRef(false);

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

  const processMessages = (messages: Message[]): Message[] => {
    return messages.map((message) => ({
      ...message,
      timestamp:
        typeof message.timestamp === "string"
          ? new Date(message.timestamp)
          : message.timestamp,
    }));
  };

  useEffect(() => {
    fetchRemainingPrompts();
    if (!welcomeMessageRef.current) {
      welcomeMessageRef.current = true;
      initializeChat();
    }
  }, []);

  const initializeChat = async () => {
    try {
      const history = await getChatHistory();
      const processedHistory = processMessages(history.data);

      const isFirstTime = applocation.state?.fromOnboarding;
      const welcomeMessage = createWelcomeMessage(isFirstTime);

      setMessages([...processedHistory, welcomeMessage]);

      if (isFirstTime) {
        startTutorial();
        window.history.replaceState({}, document.title);
      }
    } catch (error) {
      console.error("Error initializing chat:", error);
    }
  };

  const createWelcomeMessage = (isFirstTime: boolean): Message => {
    if (isFirstTime) {
      return {
        text: "Hey there! I'm Lena! Nice to meet you! I'm here to help you discover some new interests together! Ask me about some places you'd like to travel, restaurants you'd enjoy, or even some new things to check out on your streaming service of choice. Ask me anything at all and I will look at your profile and give you personalized recommendations that I am confident you will enjoy. Use me as a stepping stone for new discoveries!",
        sender: "ai",
        timestamp: new Date(),
      };
    } else {
      const suggestions = [
        "a new restaurant to try",
        "a new hobby to explore",
        "an upcoming movie you might enjoy",
        "a book that could captivate you",
        "a hidden gem in your city",
        "a fitness activity that suits your style",
        "a podcast that could pique your interest",
        "a travel destination that matches your vibe",
        "a tech gadget that could simplify your life",
        "a creative project you might want to start",
      ];
      const randomSuggestion =
        suggestions[Math.floor(Math.random() * suggestions.length)];
      return {
        text: `Welcome back! Great to see you again. How about we explore something new today? Ask me about ${randomSuggestion}!`,
        sender: "ai",
        timestamp: new Date(),
      };
    }
  };

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
        text: input.trim(),
        sender: "user",
        timestamp: new Date(),
      };
      setMessages((prevMessages) => [...prevMessages, userMessage]);
      setInput("");
      setIsLoading(true);

      try {
        await saveChatMessage(userMessage.text, "user");
        // Extract friend IDs from selectedFriends
        const friendIds =
          selectedFriends.length > 0 ? selectedFriends : undefined;

        // Pass both the input and friendIds to getRecommendation
        const response = await getRecommendation(input.trim(), friendIds);
        const aiMessage: Message = {
          text: response.data.recommendation,
          sender: "ai",
          timestamp: new Date(),
        };
        setMessages((prevMessages) => [...prevMessages, aiMessage]);
        await saveChatMessage(aiMessage.text, "ai");
        if (promptsAreLimited) {
          await updatePromptCount();
          await fetchRemainingPrompts();
        }
      } catch (error) {
        console.error("Error getting recommendation:", error);
        const errorMessage: Message = {
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
  console.log(messages);

  return (
    <div className="chatbot-container">
      <div className="chatbot-header">
        <h1 className="chatbot-title">
          <AnimatedTechIcon size={50} speed={3} /> Lena AI
        </h1>
        {canUseFriendSelection && (
          <div className="friend-selection" style={{ fontSize: "0.6em" }}>
            <Select
              isMulti
              options={friendOptions}
              value={selectedFriendOptions}
              onChange={handleFriendSelection}
              placeholder=" Include friends! This will allow Lena to discover mutual
              interests!"
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
          fontSize: "0.1em",
        }}>
        <strong>Disclaimer:</strong> AI responses may be inaccurate. We're
        continually improving, but some inaccuracies may persist.
      </p>
      <div className="chatbot-messages">
        <div ref={messagesContainerRef} className="messages-container">
          {messages?.map((message, index) => (
            <div
              key={index}
              className={`message ${
                message.sender === "user" ? "user-message" : "ai-message"
              }`}>
              <div className="message-content">
                <div>
                  {message.sender === "ai" ? (
                    <FormattedAIResponse
                      isLastMessage={
                        index === messages.length - 1 && message.sender === "ai"
                      }
                      response={message.text}
                    />
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
                    <div
                      style={{ backgroundColor: "white" }}
                      className="user-avatar">
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
