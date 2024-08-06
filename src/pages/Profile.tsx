import React, { useState, useEffect } from "react";
import { User, Interest, PrivacySetting } from "../types";
import InterestList from "../components/interests/InterestList";

interface ProfileProps {
  userId: number;
  isOwnProfile: boolean;
}

const Profile: React.FC<ProfileProps> = ({ userId, isOwnProfile }) => {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      // This would normally be an API call
      const dummyUser: User = {
        id: userId,
        name: "John Doe",
        username: "johndoe",
        avatar: "https://i.pravatar.cc/307",
        bio: "Enthusiast of technology and nature.",
        bioVisibility: PrivacySetting.FriendsOnly,
        interests: [
          {
            category: "Technology",
            items: [
              { name: "Programming", rating: 9 },
              { name: "AI", rating: 8 },
              { name: "Web Development", rating: 10 },
            ],
            visibility: PrivacySetting.Public,
          },
          {
            category: "Nature",
            items: [
              { name: "Hiking", rating: 7 },
              { name: "Bird Watching", rating: 6 },
              { name: "Gardening", rating: 8 },
            ],
            visibility: PrivacySetting.FriendsOnly,
          },
        ],
        interestsVisibility: PrivacySetting.FriendsOnly,
        friends: [],
        pendingFriendRequests: [],
      };
      setUser(dummyUser);
    };

    fetchUser();
  }, [userId]);

  if (!user) {
    return <div>Loading...</div>;
  }

  const canViewBio =
    isOwnProfile ||
    user.bioVisibility === PrivacySetting.Public ||
    user.bioVisibility === PrivacySetting.FriendsOnly; /* && isFriend */

  const canViewInterests =
    isOwnProfile ||
    user.interestsVisibility === PrivacySetting.Public ||
    user.interestsVisibility === PrivacySetting.FriendsOnly; /* && isFriend */

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
          {canViewBio && (
            <p style={{ color: "var(--text-color)" }}>{user.bio}</p>
          )}
        </div>
      </div>

      {canViewInterests && (
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
          {user.interests.map((interest, index) => {
            const canViewCategory =
              isOwnProfile ||
              interest.visibility === PrivacySetting.Public ||
              interest.visibility ===
                PrivacySetting.FriendsOnly; /* && isFriend */

            return canViewCategory ? (
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
            ) : null;
          })}
        </div>
      )}
    </div>
  );
};

export default Profile;
