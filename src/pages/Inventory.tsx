import React, { useState, useEffect } from "react";
import { FaPlus, FaPencilAlt, FaTrash, FaCamera } from "react-icons/fa";
import AnimatedTechIcon from "../components/common/AnimatedTechIcon";
import ConfirmationModal from "../components/common/ConfirmationModal";
import InventoryForm from "../components/inventory/InventoryForm";
import ExpirationAlert from "../components/inventory/ExpirationAlert";
import PhotoCaptureModal from "../components/common/PhotoCaptureComponent";
import MatchSelectionModal from "../components/common/MatchSelectionModal";
import {
  getInventoryItems,
  addInventoryItem,
  updateInventoryItem,
  deleteInventoryItem,
  processInventoryItemPhoto,
} from "../utils/api";
import "../styles/inventory.css";
import SearchInput from "../components/common/SearchInput";

interface InventoryItem {
  id: number;
  item_name: string;
  quantity: number;
  expiration_date?: string;
  created_at: string;
  updated_at: string;
}

interface InventoryFormData {
  item_name: string;
  quantity: number;
  expiration_date: string;
}

type ExpiringItemData = {
  id: number;
  item_name: string;
  quantity: number;
  expiration_date: string;
};

const Inventory: React.FC = () => {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<InventoryItem[]>([]);
  const [alertDidShow, setAlertDidShow] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [deleteItem, setDeleteItem] = useState<InventoryItem | null>(null);
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);
  const [matches, setMatches] = useState<{
    items: any[];
    suggestedName: string;
  } | null>(null);
  const [newItemFromPhoto, setNewItemFromPhoto] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [showExpirationAlert, setShowExpirationAlert] = useState(false);
  const [expiringItems, setExpiringItems] = useState<ExpiringItemData[]>([]);
  const threeDaysFromNow = new Date();
  threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

  useEffect(() => {
    loadInventory();
  }, []);

  useEffect(() => {
    setFilteredItems(items);
  }, [items]);

  // Check for expiring items whenever items list changes
  useEffect(() => {
    if (items.length > 0 && !alertDidShow) {
      const expiring = items
        .filter((item): item is InventoryItem & { expiration_date: string } => {
          if (!item.expiration_date) return false;
          const expirationDate = new Date(item.expiration_date);
          return (
            expirationDate <= threeDaysFromNow && expirationDate >= new Date()
          );
        })
        .map((item) => ({
          id: item.id,
          item_name: item.item_name,
          quantity: item.quantity,
          expiration_date: item.expiration_date,
        }));

      if (expiring.length > 0) {
        setExpiringItems(expiring);
        setShowExpirationAlert(true);
        setAlertDidShow(true);
      }
    }
  }, [items]);

  const loadInventory = async () => {
    try {
      const response = await getInventoryItems();
      setItems(response.data);
    } catch (error) {
      setError("Failed to load inventory items");
      console.error("Error loading inventory:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddItem = async (formData: InventoryFormData) => {
    if (Number(items.length) > 99) {
      setError("Inventory can't exceed 100 items");
    }
    try {
      const response = await addInventoryItem(formData);

      // Check if this was an update to an existing item or a new item
      const existingItemIndex = items.findIndex(
        (item) =>
          item.item_name.toLowerCase() === formData.item_name.toLowerCase()
      );

      if (existingItemIndex !== -1) {
        // Update existing item
        setItems((prev) =>
          prev.map((item, index) =>
            index === existingItemIndex ? response.data : item
          )
        );
      } else {
        // Add new item
        setItems((prev) => [response.data, ...prev]);
      }

      setIsFormOpen(false);
    } catch (error) {
      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError("Failed to add item");
      }
      console.error("Error adding item:", error);
    }
  };

  const handleUpdateItem = async (formData: InventoryFormData) => {
    if (!editingItem) return;
    try {
      const response = await updateInventoryItem(editingItem.id, formData);

      // If the item was deleted (quantity was 0 or less)
      if (response.data.message?.includes("removed")) {
        // Remove the item from state
        setItems((prev) => prev.filter((item) => item.id !== editingItem.id));
      } else {
        // Update the item in state
        setItems((prev) =>
          prev.map((item) =>
            item.id === response.data.id ? response.data : item
          )
        );
      }

      setEditingItem(null);
    } catch (error) {
      setError("Failed to update item");
      console.error("Error updating item:", error);
    }
  };

  const handleDeleteItem = async () => {
    if (!deleteItem) return;
    try {
      await deleteInventoryItem(deleteItem.id, deleteItem.quantity);
      setItems((prev) => prev.filter((item) => item.id !== deleteItem.id));
      setDeleteItem(null);
    } catch (error) {
      setError("Failed to delete item");
      console.error("Error deleting item:", error);
    }
  };

  const handleItemPhotoProcessing = async (imageData: string) => {
    try {
      const response = await processInventoryItemPhoto(imageData);
      setNewItemFromPhoto(response.data.suggestedName);
      if (response.data.exists) {
        if (response.data.matches.length === 1) {
          // If only one match, open edit directly
          setEditingItem(response.data.matches[0]);
        } else {
          // If multiple matches, show selection modal with suggested name
          setMatches({
            items: response.data.matches,
            suggestedName: response.data.suggestedName,
          });
        }
      } else {
        // No matches, open add form with suggested name
        handleNoMatch();
      }
    } catch (error) {
      throw error;
    }
  };

  const handleNoMatch = () => {
    setIsFormOpen(true);
    setMatches(null);
  };

  if (isLoading) {
    return (
      <div className="loading-container">
        <AnimatedTechIcon size={100} speed={4} />
      </div>
    );
  }

  return (
    <div className="inventory-container">
      <div className="inventory-header">
        <h1>My Inventory</h1>
        <div className="multi-button-list">
          <button
            onClick={() => setIsPhotoModalOpen(true)}
            className="add-item-button-list"
            style={{ backgroundColor: "var(--secondary-color)" }}>
            <FaCamera /> Add from Photo
          </button>
          <button
            onClick={() => setIsFormOpen(true)}
            className="add-item-button-list"
            style={{ backgroundColor: "var(--primary-color)" }}>
            <FaPlus /> Add Item
          </button>
        </div>
      </div>
      <SearchInput
        items={items.map((item) => ({
          ...item,
          name: item.item_name,
        }))}
        onSearch={(filtered) => setFilteredItems(filtered)}
        placeholder="Search your recipes..."
      />

      {error && <div className="error-message">{error}</div>}

      <div className="list-grid">
        {filteredItems.map((item) => (
          <div key={item.id} className="list-card">
            <div className="card-header">
              <h3 className="card-title">{item.item_name}</h3>
              <div className="card-actions">
                <button
                  onClick={() => setEditingItem(item)}
                  className="card-button edit"
                  title="Edit item">
                  <FaPencilAlt />
                </button>
                <button
                  onClick={() => setDeleteItem(item)}
                  className="card-button delete"
                  title="Delete item">
                  <FaTrash />
                </button>
              </div>
            </div>

            <div className="card-content">
              <div className="quantity-info">QTY: {item.quantity}</div>

              {item.expiration_date && (
                <div
                  className={
                    new Date(item.expiration_date) <= threeDaysFromNow &&
                    new Date(item.expiration_date) >= new Date()
                      ? "expiry-info warning"
                      : "expiry-info"
                  }>
                  Expires: {new Date(item.expiration_date).toLocaleDateString()}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {(isFormOpen || editingItem) && (
        <InventoryForm
          item={editingItem}
          initialItemName={newItemFromPhoto}
          onSubmit={editingItem ? handleUpdateItem : handleAddItem}
          onClose={() => {
            setIsFormOpen(false);
            setEditingItem(null);
            setNewItemFromPhoto(null);
          }}
        />
      )}

      {deleteItem && (
        <ConfirmationModal
          message={`Are you sure you want to delete "${deleteItem.item_name}"?`}
          onConfirm={handleDeleteItem}
          onClose={() => setDeleteItem(null)}
        />
      )}

      <PhotoCaptureModal
        isOpen={isPhotoModalOpen}
        onClose={() => setIsPhotoModalOpen(false)}
        apiFunction={handleItemPhotoProcessing}
      />

      {matches && (
        <MatchSelectionModal
          matches={matches.items}
          onSelect={(item) => {
            setEditingItem(item);
            setMatches(null);
          }}
          onNoMatch={handleNoMatch}
          onClose={() => setMatches(null)}
        />
      )}

      {showExpirationAlert && (
        <ExpirationAlert
          items={expiringItems}
          onClose={() => setShowExpirationAlert(false)}
        />
      )}
    </div>
  );
};

export default Inventory;
