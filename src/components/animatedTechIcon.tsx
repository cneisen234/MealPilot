import React from "react";
import "../styles/animatedtechicon.css";

interface AnimatedTechIconProps {
  size?: number;
  style?: React.CSSProperties;
  speed?: number;
}

const AnimatedTechIcon: React.FC<AnimatedTechIconProps> = ({
  size = 24,
  style = {},
  speed = 1,
}) => {
  const speedMultiplier = speed === 4 ? 10 : speed;
  const mainDuration = 10 / speedMultiplier;
  const hexagonDuration = 5 / speedMultiplier;
  const dashDuration = 30 / speedMultiplier;
  const orbitDuration = 4 / speedMultiplier;

  return (
    <div
      className="animated-tech-icon"
      style={{
        ...style,
        width: `${size}px`,
        height: `${size}px`,
      }}>
      <svg
        viewBox="0 0 100 100"
        className="animated-tech-icon-svg"
        style={{
          animation: `spin ${mainDuration}s linear infinite`,
        }}>
        <circle
          className="animated-tech-icon-ring"
          cx="50"
          cy="50"
          r="45"
          style={{
            animation: `dash ${dashDuration}s linear infinite`,
          }}
        />

        <polygon
          className="animated-tech-icon-hexagon"
          points="50,20 80,35 80,65 50,80 20,65 20,35"
          style={{
            animation: `spinHexagon ${hexagonDuration}s linear infinite`,
          }}
        />

        <circle className="animated-tech-icon-center" cx="50" cy="50" r="10" />

        <circle className="animated-tech-icon-orbit" cx="50" cy="15" r="3">
          <animateTransform
            attributeName="transform"
            type="rotate"
            from="0 50 50"
            to="360 50 50"
            dur={`${orbitDuration}s`}
            repeatCount="indefinite"
          />
        </circle>
        <circle className="animated-tech-icon-orbit" cx="50" cy="15" r="3">
          <animateTransform
            attributeName="transform"
            type="rotate"
            from="180 50 50"
            to="540 50 50"
            dur={`${orbitDuration}s`}
            repeatCount="indefinite"
          />
        </circle>
      </svg>
    </div>
  );
};

export default AnimatedTechIcon;
