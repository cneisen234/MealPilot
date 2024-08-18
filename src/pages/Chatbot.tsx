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
import FormattedAIResponse from "../components/FormattedAiResponse";
import { Message, PaymentTier, User } from "../types";
import AnimatedTechIcon from "../components/animatedTechIcon";

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
  const [friends, setFriends] = useState<User[]>([]);
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
  // @ts-ignore

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
          <AnimatedTechIcon size={50} speed={3} /> VibeQuest AI
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
                {message.sender === "user" &&
                  (currentUser?.avatar ? (
                    <img
                      src={currentUser.avatar}
                      alt={currentUser.name}
                      style={{
                        width: "40px",
                        height: "40px",
                        borderRadius: "50%",
                        marginLeft: "10px",
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        width: "40px",
                        height: "40px",
                        borderRadius: "50%",
                        backgroundColor: "white",
                        color: "var(--primary-color)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        marginLeft: "10px",
                        fontSize: "16px",
                        fontWeight: "bold",
                      }}>
                      {/* @ts-ignore */}
                      {getInitials(currentUser.name)}
                    </div>
                  ))}
              </div>
            </div>
          ))}
          {isLoading && <AnimatedTechIcon size={100} speed={10} />}
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
            disabled={isLoading || remainingPrompts === 0}
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
            disabled={isLoading || remainingPrompts === 0}
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
        <div style={{ textAlign: "right", margin: 10 }}>
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
