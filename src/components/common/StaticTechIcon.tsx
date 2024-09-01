import React from "react";
import "../../styles/statictechicon.css";

interface StaticTechIconProps {
  size?: number;
  style?: React.CSSProperties;
}

const StaticTechIcon: React.FC<StaticTechIconProps> = ({
  size = 24,
  style = {},
}) => {
  return (
    <div
      className="static-tech-icon"
      style={{
        ...style,
        width: `${size}px`,
        height: `${size}px`,
      }}>
      <svg viewBox="0 0 100 100" className="static-tech-icon-svg">
        <circle className="static-tech-icon-ring" cx="50" cy="50" r="48" />
        <polygon
          className="static-tech-icon-hexagon"
          points="50,15 85,32.5 85,67.5 50,85 15,67.5 15,32.5"
        />
        <circle className="static-tech-icon-center" cx="50" cy="50" r="10" />
        <circle
          className="static-tech-icon-orbit static-tech-icon-orbit-1"
          cx="50"
          cy="15"
          r="4"
        />
        <circle
          className="static-tech-icon-orbit static-tech-icon-orbit-2"
          cx="51"
          cy="85"
          r="4"
        />
      </svg>
    </div>
  );
};

export default StaticTechIcon;
