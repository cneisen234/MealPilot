// src/pages/Profile.tsx
import React, { useState, useEffect } from "react";
import { Interest, User } from "../types";
import InterestList from "../components/interests/InterestList";
import { getUserInterests } from "../utils/api";

const Profile: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    // Simulating API call to get user data
    const fetchUser = async () => {
      // This would normally be an API call
      const dummyUser: User = {
        id: 1,
        name: "John Doe",
        username: "johndoe",
        avatar: "https://i.pravatar.cc/307",
        bio: "Enthusiast of technology and nature.",
        interests: [
          {
            category: "Technology",
            items: [
              { name: "Programming", rating: 9 },
              { name: "AI", rating: 8 },
              { name: "Web Development", rating: 10 },
            ],
          },
          {
            category: "Nature",
            items: [
              { name: "Hiking", rating: 7 },
              { name: "Bird Watching", rating: 6 },
              { name: "Gardening", rating: 8 },
            ],
          },
        ],
      };
      setUser(dummyUser);
    };

    fetchUser();
  }, []);

  if (!user) {
    return <div>Loading...</div>;
  }

  return (
    <div style={{ maxWidth: "800px", margin: "0 auto", padding: "20px" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          marginBottom: "40px",
          background: "var(--surface-color)",
          borderRadius: "15px",
          padding: "30px",
          boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
        }}>
        <img
          src={user.avatar}
          alt={user.name}
          style={{
            width: "150px",
            height: "150px",
            borderRadius: "50%",
            marginRight: "30px",
            border: "3px solid var(--primary-color)",
          }}
        />
        <div>
          <h1
            style={{
              fontSize: "2.5em",
              marginBottom: "10px",
              color: "var(--primary-color)",
            }}>
            {user.name}
          </h1>
          <p
            style={{
              fontSize: "1.2em",
              color: "var(--text-color)",
              marginBottom: "10px",
            }}>
            @{user.username}
          </p>
          <p style={{ color: "var(--text-color)" }}>{user.bio}</p>
        </div>
      </div>

      <div
        style={{
          background: "var(--surface-color)",
          borderRadius: "15px",
          padding: "30px",
          boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
        }}>
        <h2
          style={{
            fontSize: "1.8em",
            marginBottom: "20px",
            color: "var(--primary-color)",
            borderBottom: "2px solid var(--primary-color)",
            paddingBottom: "10px",
          }}>
          Interests
        </h2>
        {user.interests.map((interest, index) => (
          <div key={index} style={{ marginBottom: "30px" }}>
            <h3
              style={{
                fontSize: "1.4em",
                color: "var(--secondary-color)",
                marginBottom: "15px",
              }}>
              {interest.category}
            </h3>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
              {interest.items.map((item, itemIndex) => (
                <div
                  key={itemIndex}
                  style={{
                    background: "rgba(150, 111, 214, 0.1)",
                    padding: "10px 15px",
                    borderRadius: "20px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}>
                  <span>{item.name}</span>
                  <span
                    style={{
                      marginLeft: "10px",
                      background: "var(--primary-color)",
                      color: "white",
                      borderRadius: "50%",
                      width: "25px",
                      height: "25px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "0.8em",
                    }}>
                    {item.rating}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Profile;
