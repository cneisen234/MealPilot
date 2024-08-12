import React from "react";
import "../styles/loading.css";

const Loading: React.FC = () => {
  return (
    <div className="loading-container">
      <div className="loading-circle"></div>
      <div className="loading-circle"></div>
      <div className="loading-circle"></div>
    </div>
  );
};

export default Loading;
