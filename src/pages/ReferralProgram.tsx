import { useState, useEffect } from "react";
import { FaCopy, FaCheck, FaTrophy } from "react-icons/fa";
import { useToast } from "../context/ToastContext";
import AnimatedTechIcon from "../components/common/AnimatedTechIcon";
import "../styles/referral.css";
import { getReferralStats } from "../utils/api";

interface ReferralTier {
  referrals: number;
  reward: string;
  isCompleted: boolean;
}

interface ReferralStats {
  totalReferrals: number;
  referralCode: string;
  resetDate: string;
  nextTier: number;
  activeDiscount: string;
}

const initialTiers: ReferralTier[] = [
  { referrals: 1, reward: "10% off next month", isCompleted: false },
  { referrals: 3, reward: "20% off next month", isCompleted: false },
  { referrals: 5, reward: "One free month", isCompleted: false },
  { referrals: 10, reward: "Three free months", isCompleted: false },
  { referrals: 25, reward: "One year free", isCompleted: false },
];

const ReferralProgram = () => {
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [tiers, setTiers] = useState<ReferralTier[]>(initialTiers);
  const { showToast } = useToast();

  useEffect(() => {
    fetchReferralStats();
  }, []);
  const fetchReferralStats = async () => {
    try {
      const { data } = await getReferralStats();
      setStats(data);

      // Update completed tiers based on total referrals
      const updatedTiers = initialTiers.map((tier) => ({
        ...tier,
        isCompleted: data.totalReferrals >= tier.referrals,
      }));
      setTiers(updatedTiers);
    } catch (error) {
      showToast("Error loading referral stats", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const getReferralLink = () => {
    if (!stats?.referralCode) return "";
    return `${window.location.origin}/signup/${stats.referralCode}`;
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(getReferralLink());
      setCopied(true);
      showToast("Referral link copied to clipboard!", "success");
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      showToast("Failed to copy link", "error");
    }
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
      className="referral-container"
      style={{ marginTop: 100, marginBottom: 100 }}>
      {/* Header Section */}
      <div className="referral-header">
        <h1>Referral Program</h1>
        <p>
          Share MealSphere with friends and earn rewards! Your benefits reset
          annually on{" "}
          <span className="reset-date">
            {new Date(stats?.resetDate || "").toLocaleDateString()}
          </span>
        </p>

        {/* Referral Link Section */}
        <div className="referral-link-section">
          <input
            type="text"
            value={getReferralLink()}
            readOnly
            className="referral-link-input"
          />
          <button onClick={handleCopyLink} className="copy-button">
            {copied ? <FaCheck /> : <FaCopy />}
            <span>{copied ? "Copied!" : "Copy Link"}</span>
          </button>
        </div>
      </div>

      {/* Stats Section */}
      <div className="stats-section">
        <div className="stats-header">
          <div className="stats-info">
            <h2>Your Progress</h2>
            <p>{stats?.totalReferrals || 0} successful referrals this year</p>
          </div>
          {stats?.activeDiscount && (
            <div className="active-discount">
              <p>Active: {stats.activeDiscount}</p>
            </div>
          )}
        </div>

        {/* Tiers List */}
        <div className="tiers-list">
          {tiers.map((tier) => {
            //@ts-ignore
            const isNextTier = stats?.totalReferrals < tier.referrals;
            const progress = Math.min(
              ((stats?.totalReferrals || 0) / tier.referrals) * 100,
              100
            );

            return (
              <div
                key={tier.referrals}
                className={`tier-item ${tier.isCompleted ? "completed" : ""} ${
                  isNextTier ? "next-tier" : ""
                }`}>
                <div className="tier-content">
                  <div className="tier-info">
                    {tier.isCompleted ? (
                      <FaTrophy className="trophy-icon" />
                    ) : (
                      <div className="tier-number">{tier.referrals}</div>
                    )}
                    <div className="tier-details">
                      <h3 className={tier.isCompleted ? "completed" : ""}>
                        {tier.reward}
                      </h3>
                      <p>
                        {tier.referrals} referral{tier.referrals > 1 ? "s" : ""}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="progress-bar">
                  <div
                    className={`progress-fill ${
                      tier.isCompleted ? "completed" : ""
                    }`}
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Terms Section */}
      <div className="terms-section">
        <h2>Program Terms</h2>
        <ul className="terms-list">
          <li>
            A successful referral requires the referred user to complete at
            least one paid month of service
          </li>
          <li>Each email can only be referred once</li>
          <li>Benefits are automatically applied to your next billing cycle</li>
          <li>Benefits do not compound or carry over</li>
          <li>
            If multiple discounts apply, the greater discount will be used
          </li>
          <li>Referred friends get 20% off their first paid month</li>
        </ul>
      </div>
    </div>
  );
};

export default ReferralProgram;
