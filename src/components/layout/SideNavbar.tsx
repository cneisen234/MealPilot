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

  const currentYear = new Date().getFullYear();

  return (
    <>
      <button className="hamburger-menu" onClick={toggleMenu}>
        {isOpen ? <FaTimes /> : <FaBars />}
      </button>
      <nav className={`side-navbar ${isOpen ? "open" : ""}`}>
        <ul className="nav-list">
          <NavItem
            to="/recipe"
            icon={<FaLightbulb />}
            title="NewRecipe"
            onClick={closeMenu}>
            New Recipe
          </NavItem>
          <NavItem to="/coming-soon" icon={<FaClock />} onClick={closeMenu}>
            Coming Soon
          </NavItem>
        </ul>
        <div className="copyright">
          &copy; {currentYear} MealPilot. All rights reserved.
        </div>
      </nav>
    </>
  );
};

export default SideNavbar;
