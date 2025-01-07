import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { addMultiItemsToInventory } from "../../utils/api";
import { FaCheck, FaTimes, FaBoxOpen } from "react-icons/fa";
import { getSharedList } from "../../utils/api";
import AnimatedTechIcon from "../common/AnimatedTechIcon";

interface ShoppingListItem {
  id: number;
  item_name: string;
  quantity: number;
  isSelected?: boolean;
}

const ShareableListPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { isAuthenticated } = useAuth();
  const [uncheckedItems, setUncheckedItems] = useState<ShoppingListItem[]>([]);
  const [checkedItems, setCheckedItems] = useState<ShoppingListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (id) {
      loadList();
    }
  }, [id]);

  useEffect(() => {
    // Save state changes to localStorage whenever checked/unchecked items change
    if (!isLoading && id) {
      localStorage.setItem(
        `shared-list-${id}`,
        JSON.stringify({
          unchecked: uncheckedItems,
          checked: checkedItems,
        })
      );
    }
  }, [uncheckedItems, checkedItems, id, isLoading]);

  const loadList = async () => {
    try {
      const response = await getSharedList(id!);
      console.log(response.data);
      setUncheckedItems(response.data);
    } catch (error) {
      setError(
        //@ts-ignore
        error.response?.status === 404
          ? "List not found or expired"
          : "Error loading list"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleCheckItem = (item: ShoppingListItem) => {
    setUncheckedItems((prev) => prev.filter((i) => i.id !== item.id));
    setCheckedItems((prev) => [...prev, item]);
  };

  const handleUncheckItem = (item: ShoppingListItem) => {
    setCheckedItems((prev) => prev.filter((i) => i.id !== item.id));
    setUncheckedItems((prev) => [...prev, item]);
  };

  const handleAddToInventory = async () => {
    if (!isAuthenticated) return;

    setIsSaving(true);
    try {
      //@ts-ignore
      await addMultiItemsToInventory(checkedItems);
      setCheckedItems([]); // Clear checked items after successful addition
    } catch (err) {
      setError("Failed to add items to inventory");
      console.error("Error adding to inventory:", err);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="loading-container">
        <AnimatedTechIcon size={100} speed={4} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-container">
        <p className="error-message">{error}</p>
      </div>
    );
  }

  return (
    <div className="shareable-list-container">
      <h1 className="shareable-list-title">Shopping List</h1>

      <div className="list-section">
        <h2 className="section-title">Items to Get</h2>
        {uncheckedItems.length === 0 ? (
          <p className="empty-list-message">All items have been checked off!</p>
        ) : (
          <div className="list-items">
            {uncheckedItems.map((item) => (
              <div key={item.id} className="list-item">
                <span className="list-item-content">
                  {item.quantity} {item.item_name}
                </span>
                <button
                  onClick={() => handleCheckItem(item)}
                  className="list-item-action check"
                  title="Mark as got">
                  <FaCheck />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="list-section">
        <h2 className="section-title">Got These Items</h2>
        {checkedItems.length === 0 ? (
          <p className="empty-list-message">No items checked off yet</p>
        ) : (
          <div className="list-items">
            {checkedItems.map((item) => (
              <div key={item.id} className="list-item checked">
                <span className="list-item-content">
                  {item.quantity} {item.item_name}
                </span>
                <button
                  onClick={() => handleUncheckItem(item)}
                  className="list-item-action uncheck"
                  title="Uncheck item">
                  <FaTimes />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {isAuthenticated && checkedItems.length > 0 && (
        <button
          onClick={handleAddToInventory}
          disabled={isSaving}
          className="inventory-button">
          <FaBoxOpen />
          {isSaving
            ? "Adding to Inventory..."
            : "Add Checked Items to My Inventory"}
        </button>
      )}
    </div>
  );
};

export default ShareableListPage;
