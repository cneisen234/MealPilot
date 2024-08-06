// src/pages/Friends.tsx
import React, { useState } from "react";
import { FaSearch, FaUserPlus, FaEnvelope, FaComment } from "react-icons/fa";
import ProfileView from "../components/ProfileView";
import AddFriendModal from "../components/AddFriendModal";
import { User, Interest, Item } from "../types";

const dummyFriends: User[] = [
  {
    id: 1,
    name: "Alice Johnson",
    username: "alice_j",
    avatar: "https://i.pravatar.cc/150?img=1",
    bio: "Love traveling and photography!",
    interests: [
      {
        category: "Photography",
        items: [
          { name: "DSLR Cameras", rating: 9 },
          { name: "Landscape Photography", rating: 8 },
          { name: "Photo Editing", rating: 7 },
        ],
      },
      {
        category: "Travel",
        items: [
          { name: "Backpacking", rating: 9 },
          { name: "Cultural Experiences", rating: 10 },
          { name: "Travel Planning", rating: 8 },
        ],
      },
      {
        category: "Cooking",
        items: [
          { name: "Italian Cuisine", rating: 7 },
          { name: "Baking", rating: 6 },
          { name: "Vegan Recipes", rating: 8 },
        ],
      },
    ],
  },
  {
    id: 2,
    name: "Bob Smith",
    username: "bob_smith",
    avatar: "https://i.pravatar.cc/150?img=2",
    bio: "Software developer and coffee enthusiast",
    interests: [
      {
        category: "Coding",
        items: [
          { name: "JavaScript", rating: 10 },
          { name: "React", rating: 9 },
          { name: "Node.js", rating: 8 },
        ],
      },
      {
        category: "Coffee",
        items: [
          { name: "Espresso", rating: 10 },
          { name: "Pour Over", rating: 9 },
          { name: "Latte Art", rating: 7 },
        ],
      },
      {
        category: "Hiking",
        items: [
          { name: "Mountain Trails", rating: 8 },
          { name: "Camping", rating: 7 },
          { name: "Wildlife Photography", rating: 6 },
        ],
      },
    ],
  },
  {
    id: 3,
    name: "Carol White",
    username: "carol_w",
    avatar: "https://i.pravatar.cc/150?img=3",
    bio: "Bookworm and cat lover",
    interests: [
      {
        category: "Reading",
        items: [
          { name: "Classic Literature", rating: 10 },
          { name: "Science Fiction", rating: 9 },
          { name: "Poetry", rating: 8 },
        ],
      },
      {
        category: "Cats",
        items: [
          { name: "Cat Behavior", rating: 9 },
          { name: "Cat Care", rating: 10 },
          { name: "Cat Photography", rating: 7 },
        ],
      },
      {
        category: "Yoga",
        items: [
          { name: "Vinyasa Flow", rating: 8 },
          { name: "Meditation", rating: 9 },
          { name: "Yoga Philosophy", rating: 7 },
        ],
      },
    ],
  },
  {
    id: 4,
    name: "David Brown",
    username: "david_b",
    avatar: "https://i.pravatar.cc/150?img=4",
    bio: "Fitness freak and nutrition expert",
    interests: [
      {
        category: "Fitness",
        items: [
          { name: "Weightlifting", rating: 10 },
          { name: "HIIT", rating: 9 },
          { name: "Calisthenics", rating: 8 },
        ],
      },
      {
        category: "Nutrition",
        items: [
          { name: "Meal Planning", rating: 9 },
          { name: "Macronutrients", rating: 10 },
          { name: "Supplements", rating: 8 },
        ],
      },
      {
        category: "Running",
        items: [
          { name: "Marathon Training", rating: 9 },
          { name: "Trail Running", rating: 8 },
          { name: "Running Gear", rating: 7 },
        ],
      },
    ],
  },
  {
    id: 5,
    name: "Eva Green",
    username: "eva_green",
    avatar: "https://i.pravatar.cc/150?img=5",
    bio: "Artist and nature lover",
    interests: [
      {
        category: "Painting",
        items: [
          { name: "Watercolor", rating: 10 },
          { name: "Oil Painting", rating: 8 },
          { name: "Abstract Art", rating: 9 },
        ],
      },
      {
        category: "Hiking",
        items: [
          { name: "Nature Photography", rating: 9 },
          { name: "Bird Watching", rating: 8 },
          { name: "Foraging", rating: 7 },
        ],
      },
      {
        category: "Gardening",
        items: [
          { name: "Organic Vegetables", rating: 9 },
          { name: "Flower Arranging", rating: 8 },
          { name: "Composting", rating: 7 },
        ],
      },
    ],
  },
];

const Friends: React.FC = () => {
  const [friends, setFriends] = useState<User[]>(dummyFriends);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedFriend, setSelectedFriend] = useState<User | null>(null);
  const [isAddFriendModalOpen, setIsAddFriendModalOpen] = useState(false);

  const filteredFriends = friends.filter(
    (friend) =>
      friend.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      friend.username.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        padding: "20px",
        boxSizing: "border-box",
      }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "20px",
        }}>
        <h1 style={{ color: "var(--primary-color)" }}>Friends</h1>
        <button
          onClick={() => setIsAddFriendModalOpen(true)}
          style={{
            background: "var(--primary-color)",
            color: "white",
            border: "none",
            borderRadius: "25px",
            padding: "10px 20px",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            fontSize: "16px",
            fontWeight: "bold",
            transition: "all 0.3s ease",
          }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.transform = "scale(1.05)")
          }
          onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}>
          <FaUserPlus style={{ marginRight: "10px" }} /> Add Friend
        </button>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          background: "var(--surface-color)",
          borderRadius: "25px",
          padding: "10px 20px",
          boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
          marginBottom: "20px",
        }}>
        <FaSearch style={{ color: "var(--text-color)", marginRight: "10px" }} />
        <input
          type="text"
          placeholder="Search friends..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{
            border: "none",
            background: "transparent",
            color: "var(--text-color)",
            fontSize: "16px",
            outline: "none",
            width: "100%",
          }}
        />
      </div>

      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "10px",
        }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
            gap: "20px",
          }}>
          {filteredFriends.map((friend) => (
            <div
              key={friend.id}
              style={{
                background: "var(--surface-color)",
                borderRadius: "15px",
                padding: "20px",
                boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                transition: "all 0.3s ease",
                cursor: "pointer",
              }}
              onClick={() => setSelectedFriend(friend)}
              onMouseEnter={(e) =>
                (e.currentTarget.style.transform = "translateY(-5px)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.transform = "translateY(0)")
              }>
              <img
                src={friend.avatar}
                alt={friend.name}
                style={{
                  width: "80px",
                  height: "80px",
                  borderRadius: "50%",
                  marginBottom: "10px",
                }}
              />
              <div
                style={{
                  fontWeight: "bold",
                  color: "var(--text-color)",
                  textAlign: "center",
                  marginBottom: "5px",
                }}>
                {friend.name}
              </div>
              <div
                style={{
                  fontSize: "14px",
                  color: "var(--text-color)",
                  opacity: 0.7,
                  marginBottom: "15px",
                }}>
                @{friend.username}
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  width: "100%",
                }}>
                <button
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    marginRight: "15px",
                    color: "var(--primary-color)",
                    fontSize: "20px",
                  }}
                  title="Send Message"
                  onClick={(e) => {
                    e.stopPropagation(); /* Add message functionality */
                  }}>
                  <FaComment />
                </button>
                <button
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: "var(--secondary-color)",
                    fontSize: "20px",
                  }}
                  title="Send Email"
                  onClick={(e) => {
                    e.stopPropagation(); /* Add email functionality */
                  }}>
                  <FaEnvelope />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {selectedFriend && (
        <ProfileView
          friend={selectedFriend}
          onClose={() => setSelectedFriend(null)}
        />
      )}

      {isAddFriendModalOpen && (
        <AddFriendModal onClose={() => setIsAddFriendModalOpen(false)} />
      )}
    </div>
  );
};

export default Friends;
