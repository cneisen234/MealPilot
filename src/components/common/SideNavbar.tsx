import React from "react";
import { Link, useLocation } from "react-router-dom";
import {
  FaUser,
  FaRobot,
  FaUserFriends,
  FaArrowUp,
  FaLightbulb,
  FaEnvelope,
} from "react-icons/fa";

const NavItem: React.FC<{
  to: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  title?: string;
}> = ({ to, icon, children, title }) => {
  const location = useLocation();
  const isActive = location.pathname === to;

  return (
    <li style={{ marginBottom: "15px" }}>
      <Link
        to={to}
        style={{
          textDecoration: "none",
          color: isActive ? "var(--primary-color)" : "var(--text-color)",
          display: "flex",
          alignItems: "center",
          padding: "5px",
          borderRadius: "5px",
          backgroundColor: isActive
            ? "rgba(150, 111, 214, 0.1)"
            : "transparent",
          transition: "all 0.3s ease",
        }}
        onMouseEnter={(e) =>
          (e.currentTarget.style.color = "var(--secondary-color)")
        }
        onMouseLeave={(e) =>
          (e.currentTarget.style.color = isActive
            ? "var(--primary-color)"
            : "var(--text-color)")
        }
        title={title} // Add tooltip for full text
      >
        <span style={{ marginRight: "10px", fontSize: "1.2em" }}>{icon}</span>
        {children}
      </Link>
    </li>
  );
};

const SideNavbar: React.FC = () => {
  return (
    <nav
      style={{
        width: "160px",
        height: "100%",
        backgroundColor: "var(--surface-color)",
        padding: "20px 10px",
        boxShadow: "2px 0 5px rgba(0, 0, 0, 0.1)",
      }}>
      <ul style={{ listStyle: "none", padding: 0 }}>
        <NavItem to="/profile" icon={<FaUser />}>
          Profile
        </NavItem>
        <NavItem to="/chatbot" icon={<FaRobot />}>
          Chatbot
        </NavItem>
        <NavItem to="/friends" icon={<FaUserFriends />}>
          Friends List
        </NavItem>
        <NavItem
          to="/recommendations"
          icon={<FaLightbulb />}
          title="Recommendations">
          Recs
        </NavItem>
        <NavItem to="/upgrade" icon={<FaArrowUp />}>
          Upgrade
        </NavItem>
        <NavItem to="/contact-us" icon={<FaEnvelope />} title="Contact Us">
          Contact Us
        </NavItem>
      </ul>
    </nav>
  );
};

export default SideNavbar;
