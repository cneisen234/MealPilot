import React, { useState, useEffect } from "react";
import { FaPlus, FaPencilAlt, FaTrash, FaCamera } from "react-icons/fa";
import AnimatedTechIcon from "../components/common/AnimatedTechIcon";
import ConfirmationModal from "../components/common/ConfirmationModal";
import InventoryForm from "../components/inventory/InventoryForm";
import ExpirationAlert from "../components/inventory/ExpirationAlert";
import PhotoCaptureModal from "../components/common/PhotoCaptureComponent";
import MatchSelectionModal from "../components/common/MatchSelectionModal";
import SpeechRecognitionComponent from "../components/common/SpeechRecognitionComponent";
import {
  getInventoryItems,
  addInventoryItem,
  updateInventoryItem,
  deleteInventoryItem,
  processInventoryItemPhoto,
  moveToShoppingList,
  incrementAchievement,
} from "../utils/api";
import "../styles/inventory.css";
import SearchInput from "../components/common/SearchInput";
import SortInput from "../components/common/SortInput";
import { sortHelper, SortConfig } from "../helpers/sortHelper";
import { useToast } from "../context/ToastContext";
import { useAuth } from "../context/AuthContext";

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
  const { showToast } = useToast();
  const { aiActionsRemaining, setAiActionsRemaining } = useAuth();
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
  const [showExpirationAlert, setShowExpirationAlert] = useState(false);
  const [expiringItems, setExpiringItems] = useState<ExpiringItemData[]>([]);
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    field: "id",
    direction: "desc",
    type: "number",
  });
  const sevenDaysFromNow = new Date();
  sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

  const sortOptions = [
    { label: "Recently Added", value: "id", type: "number" },
    { label: "Name", value: "item_name", type: "string" },
    { label: "Quantity", value: "quantity", type: "number" },
    { label: "Expiration Date", value: "expiration_date", type: "date" },
  ];

  useEffect(() => {
    loadInventory();
  }, []);

  useEffect(() => {
    if (items.length > 0) {
      const sorted = sortHelper(items, sortConfig);
      setFilteredItems(sorted);
    } else {
      // Ensure filteredItems is empty when items is empty
      setFilteredItems([]);
    }
  }, [items, sortConfig]);

  // Check for expiring items whenever items list changes
  useEffect(() => {
    if (items.length > 0 && !alertDidShow) {
      const expiring = items
        .filter((item): item is InventoryItem & { expiration_date: string } => {
          if (!item.expiration_date) return false;
          const expirationDate = new Date(item.expiration_date);
          return (
            expirationDate <= sevenDaysFromNow || expirationDate < new Date()
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

  const handleSpeechMatches = (
    matches: Array<{ id: number; item_name: string }>
  ) => {
    setMatches({
      items: matches,
      suggestedName: matches[0].item_name,
    });
  };

  const handleSpeechNoMatch = (spokenText: string) => {
    setNewItemFromPhoto(spokenText); // We can reuse this state for speech input
    handleNoMatch();
  };

  const loadInventory = async () => {
    try {
      const response = await getInventoryItems();
      setItems(response.data);
    } catch (error) {
      showToast("Failed to load inventory items", "error");
      console.error("Error loading inventory:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddItem = async (formData: InventoryFormData) => {
    if (items.length >= 200) {
      showToast("Inventory limit reached. Maximum 200 items allowed.", "error");
      return;
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
      showToast("Item added successfully!", "success");
    } catch (error) {
      showToast("Failed to add item", "error");
      showToast("Error adding item. Please try again.", "error");
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
      showToast("Failed to update item", "error");
      console.error("Error updating item:", error);
    }
  };

  const handleDeleteItem = async () => {
    if (!deleteItem) return;
    try {
      await deleteInventoryItem(deleteItem.id, deleteItem.quantity);
      setItems((prev) => {
        const newItems = prev.filter((item) => item.id !== deleteItem.id);
        // If items array is now empty, make sure filtered items is also empty
        if (newItems.length === 0) {
          setFilteredItems([]);
        } else {
          // Apply current sort configuration to filtered items
          const sorted = sortHelper(newItems, sortConfig);
          setFilteredItems(sorted);
        }
        return newItems;
      });
      showToast("Item deleted successfully", "success");
      setDeleteItem(null);
    } catch (error) {
      showToast("Error deleting item", "error");
    }
  };

  const handleItemPhotoProcessing = async (imageData: string) => {
    try {
      const response = await processInventoryItemPhoto(imageData);
      const result = await incrementAchievement("items_photo_added");
      if (result.toast) {
        showToast(result.toast.message, "info");
      }
      if (aiActionsRemaining === 10) {
        showToast(`You are running low on AI actions for today`, "warning");
      }
      if (aiActionsRemaining < 1) {
        showToast(
          "You've reached your daily AI action limit. Try another method.",
          "error"
        );
        return;
      }
      setNewItemFromPhoto(response.data.suggestedName);
      if (response.data.exists) {
        setMatches({
          items: response.data.matches,
          suggestedName: response.data.suggestedName,
        });
      } else {
        // No matches, open add form with suggested name
        handleNoMatch();
      }
      showToast("Item photo processed successfully", "success");
      const remainingActions = aiActionsRemaining - 1;
      setAiActionsRemaining(remainingActions);
    } catch (error) {
      showToast("Error processing item photo", "error");
    }
  };

  const handleNoMatch = () => {
    setIsFormOpen(true);
    setMatches(null);
  };

  const handleMoveToShoppingList = async (itemId: number) => {
    try {
      await moveToShoppingList(itemId);
      showToast("Item moved to shopping list successfully", "success");
      setItems((prev) => prev.filter((item) => item.id !== itemId));
      setEditingItem(null);
    } catch (error) {
      showToast("Error moving item to shopping list", "error");
    }
  };

  if (isLoading) {
    return (
      <div className="loading-container">
        <AnimatedTechIcon size={100} speed={4} />
      </div>
    );
  }

  const handleSearch = (filtered: InventoryItem[]) => {
    const sorted = sortHelper(filtered, sortConfig);
    setFilteredItems(sorted);
  };

  const handleSort = (field: string, direction: "asc" | "desc") => {
    const type =
      sortOptions.find((opt) => opt.value === field)?.type || "string";
    //@ts-ignore
    setSortConfig({ field, direction, type });
  };

  if (showExpirationAlert) {
    return (
      <ExpirationAlert
        items={expiringItems}
        onClose={() => setShowExpirationAlert(false)}
      />
    );
  }

  if (matches) {
    return (
      <MatchSelectionModal
        matches={matches.items}
        onSelect={(item) => {
          setEditingItem(item);
          setMatches(null);
        }}
        onNoMatch={handleNoMatch}
        onClose={() => setMatches(null)}
      />
    );
  }

  return (
    <div
      className="inventory-container"
      style={{ marginBottom: 150, marginTop: 50 }}>
      <div className="inventory-header">
        <h1>My Inventory</h1>
        <div className="multi-button-list">
          <button
            onClick={() => setIsPhotoModalOpen(true)}
            className="add-item-button-list"
            style={{ backgroundColor: "var(--secondary-color)" }}>
            <FaCamera /> Add/Edit from Photo
          </button>
          <SpeechRecognitionComponent
            items={items}
            onMatches={handleSpeechMatches}
            onNoMatch={handleSpeechNoMatch}
            setNewItemFromPhoto={setNewItemFromPhoto}
          />
          <button
            onClick={() => setIsFormOpen(true)}
            className="add-item-button-list"
            style={{ backgroundColor: "var(--secondary-color)" }}>
            <FaPlus /> Add Item
          </button>
        </div>
      </div>
      <SearchInput
        items={items.map((item) => ({
          ...item,
          name: item.item_name,
        }))}
        onSearch={handleSearch}
        placeholder="Search your inventory..."
      />
      <div className="inventory-filters">
        <SortInput
          //@ts-ignore
          options={sortOptions}
          onSort={handleSort}
          defaultSort={{ field: "id", direction: "desc" }}
        />
      </div>
      {filteredItems.length === 0 ? (
        <div className="empty-state">
          <p>No items in your list</p>
        </div>
      ) : (
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
            </div>
          ))}
        </div>
      )}

      {(isFormOpen || editingItem) && (
        <InventoryForm
          item={editingItem}
          onSubmit={editingItem ? handleUpdateItem : handleAddItem}
          onClose={() => {
            setIsFormOpen(false);
            setEditingItem(null);
          }}
          onMoveToShoppingList={handleMoveToShoppingList}
          initialItemName={newItemFromPhoto}
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
    </div>
  );
};

export default Inventory;
