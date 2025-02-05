import { useState, useEffect } from "react";
import { FaStar } from "react-icons/fa";
import AnimatedTechIcon from "../components/common/AnimatedTechIcon";
import { getAchievements } from "../utils/api";
import { useToast } from "../context/ToastContext";
import "../styles/achievements.css";

const MILESTONES = [1, 5, 10, 20, 50, 100, 500, 1250, 5000];

const ACHIEVEMENT_CATEGORIES = {
  recipes_generated: {
    title: "Recipes Generated",
    description: "Total recipes created using AI generation",
    icon: "🧪",
  },
  recipes_imported: {
    title: "Recipes Imported",
    description: "Recipes imported from websites or photos",
    icon: "📥",
  },
  meal_plans_created: {
    title: "Meal Plans Created",
    description: "Weekly meal plans generated",
    icon: "📅",
  },
  items_photo_added: {
    title: "Items Added by Photo",
    description: "Items added to inventory or shopping list using photos",
    icon: "📸",
  },
  items_voice_added: {
    title: "Items Added by Voice",
    description: "Items added to inventory or shopping list using voice",
    icon: "🎤",
  },
  receipt_updates: {
    title: "Receipt Updates",
    description: "Shopping lists updated using receipt scanning",
    icon: "🧾",
  },
  lists_shared: {
    title: "Lists Shared",
    description: "Shopping lists shared with others",
    icon: "🔄",
  },
};

const Achievements = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [achievements, setAchievements] = useState({});
  const { showToast } = useToast();

  useEffect(() => {
    loadAchievements();
  }, []);

  const loadAchievements = async () => {
    try {
      setIsLoading(true);
      const response = await getAchievements();
      setAchievements(response.data);
    } catch (error) {
      showToast("Error loading achievements", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const getMilestoneProgress = (count: number) => {
    const currentMilestone =
      MILESTONES.find((m) => count <= m) || MILESTONES[MILESTONES.length - 1];
    const previousMilestone =
      MILESTONES[MILESTONES.indexOf(currentMilestone) - 1] || 0;
    const progress =
      ((count - previousMilestone) / (currentMilestone - previousMilestone)) *
      100;
    return {
      progress,
      nextMilestone: currentMilestone,
      currentCount: count,
    };
  };

  if (isLoading) {
    return (
      <div className="loading-container">
        <AnimatedTechIcon size={100} speed={4} />
      </div>
    );
  }

  return (
    <div
      className="achievements-container"
      style={{ marginTop: 100, marginBottom: 100 }}>
      <div className="achievements-header">
        <h1>Your Achievements</h1>
        <p>Track your progress and unlock new milestones!</p>
      </div>

      <div className="achievements-grid">
        {Object.entries(ACHIEVEMENT_CATEGORIES).map(([key, category]) => {
          //@ts-ignore
          const count = achievements[key] || 0;
          const { progress, nextMilestone, currentCount } =
            getMilestoneProgress(count);

          return (
            <div key={key} className="achievement-card">
              <div className="achievement-header">
                <div className="achievement-title">
                  <span className="achievement-icon">{category.icon}</span>
                  <div className="achievement-info">
                    <h3>{category.title}</h3>
                    <p>{category.description}</p>
                  </div>
                </div>
                <div className="achievement-count">
                  <span className="current-count">{currentCount}</span>
                  <span className="next-milestone">/ {nextMilestone}</span>
                </div>
              </div>

              <div className="progress-bar-container">
                <div
                  className="progress-bar-fill"
                  style={{ width: `${progress}%` }}
                />
              </div>

              <div className="milestone-badges">
                {MILESTONES.filter((m) => count >= m).map((milestone) => (
                  <div key={milestone} className="milestone-badge completed">
                    <FaStar className="milestone-star" />
                    <span>{milestone}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Achievements;
