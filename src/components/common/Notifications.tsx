import React, { useState, useEffect, useRef } from "react";
import { FaBell, FaUser, FaTimes } from "react-icons/fa";
import {
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from "../../utils/api";
import { Notification } from "../../types";
import "../../styles/notifications.css";

const Notifications: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const panelRef = useRef<HTMLDivElement>(null);
  const bellRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    fetchNotifications();
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    setUnreadCount(notifications.filter((n) => !n.read).length);
  }, [notifications]);

  const fetchNotifications = async () => {
    try {
      const response = await getNotifications();
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

  const markAllAsRead = async () => {
    try {
      await markAllNotificationsAsRead();
      setNotifications(
        notifications.map((notif) => ({ ...notif, read: true }))
      );
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
    }
  };

  const toggleNotifications = () => {
    if (!isOpen && unreadCount > 0) {
      markAllAsRead();
    }
    setIsOpen(!isOpen);
  };

  const handleClickOutside = (event: MouseEvent) => {
    if (
      panelRef.current &&
      !panelRef.current.contains(event.target as Node) &&
      bellRef.current &&
      !bellRef.current.contains(event.target as Node)
    ) {
      setIsOpen(false);
    }
  };

  return (
    <div className="notifications-container">
      <FaBell
        // @ts-ignore
        ref={bellRef}
        onClick={toggleNotifications}
        className="notification-bell"
      />
      {unreadCount > 0 && (
        <span className="notification-badge">{unreadCount}</span>
      )}
      <div
        className={`notifications-panel ${isOpen ? "open" : ""}`}
        ref={panelRef}>
        <div className="notifications-header">
          <h2 style={{ marginLeft: 50 }}>Notifications</h2>
          <FaTimes
            onClick={toggleNotifications}
            className="close-button mobile-only"
          />
        </div>
        <div className="notifications-list">
          {notifications.map((notif) => (
            <div
              key={notif.id}
              onClick={() => markAsRead(notif.id)}
              className={`notification-item ${notif.read ? "read" : "unread"}`}>
              <FaUser className="notification-icon" />
              <div className="notification-content">
                <div className="notification-message">{notif.content}</div>
                <div className="notification-time">
                  {new Date(notif.created_at).toLocaleString()}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Notifications;
