import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { FaCog, FaUserCog, FaUsers, FaSignOutAlt } from "react-icons/fa";
import "../../styles/header.css";

const Header: React.FC = () => {
  const { isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const handleMenuClick = (path: string) => {
    setIsDropdownOpen(false);
    navigate(path);
  };

  return (
    <header className="header">
      <div className="header-title">
        <img
          src="/MealPilot-icon-transparent.png"
          alt="MealSphere Logo"
          className="header-logo"
        />
        MealSphere
      </div>
      <nav className="header-nav">
        {isAuthenticated && (
          <div className="dropdown-container" ref={dropdownRef}>
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="dropdown-trigger">
              <FaCog className="gear-icon" />
            </button>
            {isDropdownOpen && (
              <div className="dropdown-menu">
                {/* <button
                  onClick={() => handleMenuClick("/account-settings")}
                  className="dropdown-item">
                  <FaUserCog className="dropdown-icon" />
                  Account Settings
                </button>
                <button
                  onClick={() => handleMenuClick("/referral-program")}
                  className="dropdown-item">
                  <FaUsers className="dropdown-icon" />
                  Referral Program
                </button> */}
                <button onClick={handleLogout} className="dropdown-item">
                  <FaSignOutAlt className="dropdown-icon" />
                  Logout
                </button>
              </div>
            )}
          </div>
        )}
      </nav>
    </header>
  );
};

export default Header;
