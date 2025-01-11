import React from "react";
import { Link, useLocation } from "react-router-dom";
import {
  FaLightbulb,
  FaBook,
  FaCalendar,
  FaBoxes,
  FaShoppingBasket,
} from "react-icons/fa";
import "../../styles/sidebar.css";

interface NavItemProps {
  to: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  title?: string;
}

const NavItem: React.FC<NavItemProps> = ({ to, icon, children, title }) => {
  const location = useLocation();
  const isActive = location.pathname === to;

  return (
    <li className="nav-item">
      <Link
        to={to}
        className={`nav-link ${isActive ? "active" : ""}`}
        title={title}>
        <span className="nav-icon">{icon}</span>
        {children}
      </Link>
    </li>
  );
};

interface MobileNavItemProps {
  to: string;
  icon: React.ReactNode;
  label: string;
}

const MobileNavItem: React.FC<MobileNavItemProps> = ({ to, icon, label }) => {
  const location = useLocation();
  const isActive = location.pathname === to;

  return (
    <Link
      to={to}
      className={`mobile-nav-item ${isActive ? "mobile-nav-active" : ""}`}>
      <div className="mobile-nav-icon">{icon}</div>
      <span className="mobile-nav-label">{label}</span>
    </Link>
  );
};

const navItems = [
  { path: "/recipe", icon: <FaLightbulb />, label: "Generate" },
  { path: "/myrecipes", icon: <FaBook />, label: "Recipes" },
  { path: "/mealplan", icon: <FaCalendar />, label: "Plan" },
  { path: "/inventory", icon: <FaBoxes />, label: "Inventory" },
  { path: "/shopping-list", icon: <FaShoppingBasket />, label: "List" },
];

const SideNavbar: React.FC = () => {
  const currentYear = new Date().getFullYear();

  return (
    <>
      {/* Desktop Sidebar */}
      <nav className="side-navbar">
        <ul className="nav-list">
          {navItems.map((item) => (
            <NavItem
              key={item.path}
              to={item.path}
              icon={item.icon}
              title={item.label}>
              {item.label}
            </NavItem>
          ))}
        </ul>
        <div className="copyright">
          &copy; {currentYear} MealPilot. All rights reserved.
        </div>
      </nav>

      {/* Mobile Footer Navigation */}
      <>
        <>
          <div className="mobile-copyright">
            &copy; {currentYear} MealPilot. All rights reserved.
          </div>
          <nav className="mobile-navbar">
            {navItems.map((item) => (
              <MobileNavItem
                key={item.path}
                to={item.path}
                icon={item.icon}
                label={item.label}
              />
            ))}
          </nav>
        </>
        <nav className="mobile-navbar">
          {navItems.map((item) => (
            <MobileNavItem
              key={item.path}
              to={item.path}
              icon={item.icon}
              label={item.label}
            />
          ))}
        </nav>
      </>
    </>
  );
};

export default SideNavbar;
