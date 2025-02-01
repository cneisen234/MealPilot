import React from "react";
import { FaArrowLeft } from "react-icons/fa";

const SharedListPreview = ({ items, onBack }: any) => {
  return (
    <div
      className="shareable-list-container"
      style={{ paddingLeft: 0, paddingRight: 0 }}>
      <div className="preview-header" style={{ marginBottom: 10 }}>
        <button onClick={onBack} className="recipe-action-button back-button">
          <FaArrowLeft className="button-icon" />
        </button>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: "32px",
          gap: "16px",
        }}>
        <img
          src="/MealPilot-icon-transparent.png"
          alt="MealSphere"
          style={{
            width: "48px",
            height: "48px",
          }}
        />
        <h1
          style={{
            background:
              "linear-gradient(45deg, var(--primary-color) 35%, var(--secondary-color) 85%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
            color: "transparent",
            margin: "0",
            fontSize: "2.5rem",
          }}>
          MealSphere
        </h1>
      </div>

      <div className="list-section">
        <h2 className="section-title">Items to Get</h2>
        {items.length === 0 ? (
          <p className="empty-list-message">No items selected to share</p>
        ) : (
          <div className="list-items">
            {items.map((item: any) => (
              <div key={item.id} className="list-item">
                <span className="list-item-content">
                  {item.quantity} {item.item_name}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default SharedListPreview;
