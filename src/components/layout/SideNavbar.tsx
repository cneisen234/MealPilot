import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  FaUser,
  FaUserFriends,
  FaArrowUp,
  FaLightbulb,
  FaEnvelope,
  FaClock,
  FaBars,
  FaTimes,
} from "react-icons/fa";
import AnimatedTechIcon from "../common/AnimatedTechIcon";
import "../../styles/sidebar.css";

const NavItem: React.FC<{
  to: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  title?: string;
  onClick: () => void;
}> = ({ to, icon, children, title, onClick }) => {
  const location = useLocation();
  const isActive = location.pathname === to;

  return (
    <li className="nav-item">
      <Link
        to={to}
        className={`nav-link ${isActive ? "active" : ""}`}
        title={title}
        onClick={onClick}>
        <span className="nav-icon">{icon}</span>
        {children}
      </Link>
    </li>
  );
};

const SideNavbar: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);

  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };

  const closeMenu = () => {
    setIsOpen(false);
  };

  return (
    <>
      <button className="hamburger-menu" onClick={toggleMenu}>
        {isOpen ? <FaTimes /> : <FaBars />}
      </button>
      <nav className={`side-navbar ${isOpen ? "open" : ""}`}>
        <ul className="nav-list">
          <NavItem to="/profile" icon={<FaUser />} onClick={closeMenu}>
            Profile
          </NavItem>
          <NavItem
            to="/chatbot"
            icon={<AnimatedTechIcon speed={2} />}
            onClick={closeMenu}>
            Lena AI
          </NavItem>
          <NavItem to="/friends" icon={<FaUserFriends />} onClick={closeMenu}>
            Friends List
          </NavItem>
          <NavItem
            to="/recommendations"
            icon={<FaLightbulb />}
            title="Recommendations"
            onClick={closeMenu}>
            Recs
          </NavItem>
          <NavItem to="/coming-soon" icon={<FaClock />} onClick={closeMenu}>
            Coming Soon
          </NavItem>
          <NavItem to="/upgrade" icon={<FaArrowUp />} onClick={closeMenu}>
            Upgrade
          </NavItem>
          <NavItem
            to="/contact-us"
            icon={<FaEnvelope />}
            title="Contact Us"
            onClick={closeMenu}>
            Contact Us
          </NavItem>
        </ul>
      </nav>
    </>
  );
};

export default SideNavbar;
