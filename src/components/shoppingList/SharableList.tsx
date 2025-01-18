import React, { useState, useEffect } from "react";
import { FaCheck } from "react-icons/fa";

interface ShoppingListItem {
  id: number;
  item_name: string;
  quantity: number;
  isSelected?: boolean;
}

interface ShareableListProps {
  items: ShoppingListItem[];
  onMoveToInventory?: (items: ShoppingListItem[]) => Promise<void>;
  hideChecks?: boolean;
}

const ShareableList: React.FC<ShareableListProps> = ({ items, hideChecks }) => {
  const [uncheckedItems, setUncheckedItems] = useState<ShoppingListItem[]>([]);
  const [checkedItems, setCheckedItems] = useState<ShoppingListItem[]>([]);

  useEffect(() => {
    setUncheckedItems(items.filter((item) => item.isSelected));
  }, [items]);

  const handleCheckItem = (item: ShoppingListItem) => {
    setUncheckedItems((prev) => prev.filter((i) => i.id !== item.id));
    setCheckedItems((prev) => [...prev, item]);
  };

  const ItemList = ({
    items,
    onAction,
    actionIcon,
    emptyMessage,
  }: {
    items: ShoppingListItem[];
    onAction: (item: ShoppingListItem) => void;
    actionIcon: React.ReactNode;
    emptyMessage: string;
  }) => (
    <div className="shareable-list-section">
      {items.length === 0 ? (
        <p className="empty-list-message">{emptyMessage}</p>
      ) : (
        <div className="list-items">
          {items.map((item) => (
            <div key={item.id} className="sharable-list-item">
              <span className="list-item-content">
                {item.quantity} {item.item_name}
              </span>
              {!hideChecks && (
                <button
                  onClick={() => onAction(item)}
                  className="list-item-action">
                  {actionIcon}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="shareable-list">
      <div className="unchecked-section">
        <h2 className="section-title">Items to Get</h2>
        <ItemList
          items={uncheckedItems}
          onAction={handleCheckItem}
          actionIcon={<FaCheck />}
          emptyMessage="No items to get"
        />
      </div>
    </div>
  );
};

export default ShareableList;
