import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { getAffiliateReferrals, sendInvoiceEmail } from "../utils/api";
import { useToast } from "../context/ToastContext";
import AnimatedTechIcon from "../components/common/AnimatedTechIcon";
import "../styles/affiliatedashboard.css";

interface ReferralUser {
  name: string;
  email: string;
  has_subscription: boolean;
  affiliate_paid: boolean | null;
}

interface ReferralStats {
  total_referrals: number;
  subscribed_users: number;
  pending_payments: number;
}

const AffiliateDashboard: React.FC = () => {
  const [referrals, setReferrals] = useState<ReferralUser[]>([]);
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isInvoicing, setIsInvoicing] = useState(false);
  const { affiliateCode, logoutAffiliate } = useAuth();
  const { showToast } = useToast();

  useEffect(() => {
    const loadReferrals = async () => {
      try {
        const response = await getAffiliateReferrals(affiliateCode);
        console.log("I'm running", response.data);
        setReferrals(response.data.referrals);
        setStats(response.data.stats);
      } catch (error) {
        console.error("Error loading referrals:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadReferrals();
  }, []);

  // Calculate unpaid subscribed users and earnings
  const calculateUnpaidEarnings = () => {
    const unpaidSubscribedUsers = referrals.filter(
      (user) => user.has_subscription && user.affiliate_paid === false
    ).length;
    return unpaidSubscribedUsers * 7.5;
  };

  const handleSendInvoice = async () => {
    setIsInvoicing(true);
    try {
      const earnings = calculateUnpaidEarnings();
      const unpaidUsers = referrals.filter(
        (user) => user.has_subscription && user.affiliate_paid === false
      );

      await sendInvoiceEmail({
        amount: earnings,
        userCount: unpaidUsers.length,
        affiliateCode: affiliateCode || "",
      });
      showToast("Invoice sent successfully!", "success");
    } catch (error) {
      console.error("Error sending invoice:", error);
      showToast("Error sending invoice", "error");
    } finally {
      setIsInvoicing(false);
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
    <div className="affiliate-dashboard">
      <button
        onClick={logoutAffiliate}
        style={{ float: "right" }}
        className="logout-button">
        Logout
      </button>
      <div className="dashboard-header">
        <h1>Referral Program</h1>
        <p className="referral-description">
          Cope your affiliate link below to be credited for sign ups!
        </p>
        <div className="referral-link-container">
          <input
            type="text"
            value={`https://mealsphere.vibequest.ai/signup/${affiliateCode}`}
            readOnly
            className="referral-link-input"
          />
          <button
            onClick={() => {
              navigator.clipboard.writeText(
                `https://mealsphere.vibequest.ai/signup/${affiliateCode}`
              );
              showToast("link copied to clipboard", "success");
            }}
            className="copy-link-button">
            Copy Link
          </button>
        </div>
      </div>

      {stats && (
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-value">{stats.total_referrals}</div>
            <div className="stat-label">Total Referrals</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{stats.subscribed_users}</div>
            <div className="stat-label">Subscribed Users</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{stats.pending_payments}</div>
            <div className="stat-label">Pending Payments</div>
          </div>
          <div className="stat-card earnings-card">
            <div className="stat-value">
              ${calculateUnpaidEarnings().toFixed(2)}
            </div>
            <div className="stat-label">Available Earnings</div>
            <button
              onClick={handleSendInvoice}
              disabled={calculateUnpaidEarnings() === 0 || isInvoicing}
              className="invoice-button">
              {isInvoicing ? "Sending..." : "Send Invoice"}
            </button>
          </div>
        </div>
      )}

      <div className="referrals-section">
        <h2>Your Referrals</h2>
        <div className="referrals-grid">
          {referrals?.length === 0 ? (
            <div className="no-referrals">
              No referrals yet. Share your affiliate code to start earning!
            </div>
          ) : (
            referrals?.map((user, index) => (
              <div key={index} className="referral-card">
                <div className="referral-header">
                  <h3>{user.name}</h3>
                  <span className="referral-email">{user.email}</span>
                </div>
                <div className="referral-status">
                  <div className="status-item">
                    <label>Subscription</label>
                    <span
                      className={`status ${
                        user.has_subscription ? "active" : "inactive"
                      }`}>
                      {user.has_subscription ? "Subscribed" : "Not Subscribed"}
                    </span>
                  </div>
                  <div className="status-item">
                    <label>Payment</label>
                    <span
                      className={`payment-status ${
                        user.affiliate_paid === true
                          ? "paid"
                          : user.affiliate_paid === false
                          ? "unpaid"
                          : ""
                      }`}>
                      {user.affiliate_paid === true
                        ? "Paid"
                        : user.affiliate_paid === false
                        ? "Unpaid"
                        : ""}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default AffiliateDashboard;
