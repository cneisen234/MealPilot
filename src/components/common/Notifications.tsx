import React, { useState, useEffect } from "react";
import { FaBell, FaUser } from "react-icons/fa";
import { getNotifications, markNotificationAsRead } from "../../utils/api";
import { Notification } from "../../types";

const Notifications: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      const response = await getNotifications();
      console.log(response);
      setNotifications(response.data);
    } catch (error) {
      console.error("Error fetching notifications:", error);
    }
  };

  const markAsRead = async (id: number) => {
    try {
      await markNotificationAsRead(id);
      setNotifications(
        notifications.map((notif) =>
          notif.id === id ? { ...notif, read: true } : notif
        )
      );
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div style={{ position: "relative" }}>
      <FaBell
        onClick={() => setShowNotifications(!showNotifications)}
        style={{ cursor: "pointer", fontSize: "24px" }}
      />
      {unreadCount > 0 && (
        <span
          style={{
            position: "absolute",
            top: "-10px",
            right: "-10px",
            background: "red",
            color: "white",
            borderRadius: "50%",
            padding: "2px 6px",
            fontSize: "12px",
          }}>
          {unreadCount}
        </span>
      )}
      {showNotifications && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            right: 0,
            background: "white",
            border: "1px solid #ccc",
            borderRadius: "8px",
            padding: "10px",
            width: "300px",
            maxHeight: "400px",
            overflowY: "auto",
            boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
          }}>
          {notifications.map((notif) => (
            <div
              key={notif.id}
              onClick={() => markAsRead(notif.id)}
              style={{
                padding: "10px",
                borderBottom: "1px solid #eee",
                display: "flex",
                alignItems: "center",
                background: notif.read ? "white" : "rgba(150, 111, 214, 0.1)",
                cursor: "pointer",
              }}>
              <FaUser
                style={{ marginRight: "10px", color: "var(--primary-color)" }}
              />
              <div>
                <div style={{ fontSize: "14px", marginBottom: "5px" }}>
                  {notif.content}
                </div>
                <div style={{ fontSize: "12px", color: "#666" }}>
                  {new Date(notif.created_at).toLocaleString()}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Notifications;
