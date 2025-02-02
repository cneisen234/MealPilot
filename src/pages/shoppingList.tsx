import React, { useState, useEffect } from "react";
import {
  FaPlus,
  FaPencilAlt,
  FaTrash,
  FaTags,
  FaReceipt,
  FaShare,
  FaCamera,
  FaEye,
  FaArrowLeft,
} from "react-icons/fa";
import AnimatedTechIcon from "../components/common/AnimatedTechIcon";
import ConfirmationModal from "../components/common/ConfirmationModal";
import ShoppingListForm from "../components/shoppingList/shoppingListForm";
import PhotoCaptureModal from "../components/common/PhotoCaptureComponent";
import SpeechRecognitionComponent from "../components/common/SpeechRecognitionComponent";
import {
  getShoppingList,
  addShoppingListItem,
  updateShoppingListItem,
  deleteShoppingListItem,
  moveToInventory,
  addMultiItemsToInventory,
  processReceipt,
  processShoppingItemPhoto,
} from "../utils/api";
import "../styles/inventory.css";
import ReceiptMatchesModal from "../components/shoppingList/ReceiptMatchesModal";
import ShareableListModal from "../components/shoppingList/SharableListModal";
import MatchSelectionModal from "../components/common/MatchSelectionModal";
import SearchInput from "../components/common/SearchInput";
import SortInput from "../components/common/SortInput";
import SharedListPreview from "./SharedListPreview";
import { sortHelper, SortConfig } from "../helpers/sortHelper";
import { useToast } from "../context/ToastContext";
import { useAuth } from "../context/AuthContext";

interface Recipe {
  id: number;
  title: string;
}

interface ShoppingListItem {
  id: number;
  item_name: string;
  quantity: number;
  created_at: string;
  updated_at: string;
  tagged_recipes: Recipe[];
  isSelected?: boolean;
}

interface ShoppingListFormData {
  item_name: string;
  quantity: number;
  recipe_ids: number[];
}

const ShoppingList: React.FC = () => {
  const { showToast } = useToast();
  const { aiActionsRemaining, setAiActionsRemaining } = useAuth();
  const [items, setItems] = useState<ShoppingListItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<ShoppingListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ShoppingListItem | null>(null);
  const [deleteItem, setDeleteItem] = useState<ShoppingListItem | null>(null);
  const [isUploadingReceipt, setIsUploadingReceipt] = useState(false);
  const [receiptMatches, setReceiptMatches] = useState<any[] | null>(null);
  const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set());
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [isItemPhotoModalOpen, setIsItemPhotoModalOpen] = useState(false);
  const [newItemFromPhoto, setNewItemFromPhoto] = useState<string | null>(null);
  const [matches, setMatches] = useState<any[] | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  const sortOptions = [
    { label: "Recently Added", value: "id", type: "number" },
    { label: "Name", value: "item_name", type: "string" },
    { label: "Quantity", value: "quantity", type: "number" },
  ];

  const [sortConfig, setSortConfig] = useState<SortConfig>({
    field: "id",
    direction: "desc",
    type: "number",
  });

  useEffect(() => {
    loadShoppingList();
  }, []);

  useEffect(() => {
    if (items.length > 0) {
      // Select all items by default upon items update
      const allItemIds = new Set(items.map((item) => item.id));
      setSelectedItems(allItemIds);
    }
  }, [items]);

  useEffect(() => {
    if (items.length > 0) {
      const sorted = sortHelper(items, sortConfig);
      setFilteredItems(sorted);
    } else {
      // Ensure filteredItems is empty when items is empty
      setFilteredItems([]);
    }
  }, [items, sortConfig]);

  const handleSpeechMatches = (
    matches: Array<{ id: number; item_name: string }>
  ) => {
    setMatches(matches);
  };

  const handleSpeechNoMatch = (spokenText: string) => {
    setNewItemFromPhoto(spokenText); // Reuse photo state for speech input
    handleNoMatch();
  };

  const handleSearch = (filtered: ShoppingListItem[]) => {
    const sorted = sortHelper(filtered, sortConfig);
    setFilteredItems(sorted);
  };

  const handleSort = (field: string, direction: "asc" | "desc") => {
    const type =
      sortOptions.find((opt) => opt.value === field)?.type || "string";
    //@ts-ignore
    setSortConfig({ field, direction, type });
  };

  const handleToggleSelect = (itemId: number) => {
    const newSelectedItems = new Set(selectedItems);
    if (newSelectedItems.has(itemId)) {
      newSelectedItems.delete(itemId);
    } else {
      newSelectedItems.add(itemId);
    }
    setSelectedItems(newSelectedItems);
  };

  const handleShareList = () => {
    setIsShareModalOpen(true);
  };

  const loadShoppingList = async () => {
    try {
      const response = await getShoppingList();
      setItems(response.data);

      // Select all items by default
      const allItemIds = new Set(
        response.data.map((item: ShoppingListItem) => item.id)
      );
      //@ts-ignore
      setSelectedItems(allItemIds); // Set all items as selected
    } catch (error) {
      showToast("Failed to load shopping list items", "error");
    } finally {
      console.log("I'm running");
      setIsLoading(false);
    }
  };

  const handleReceiptProcessing = async (imageData: string) => {
    try {
      setIsUploadingReceipt(true);
      const response = await processReceipt(imageData);
      if (aiActionsRemaining === 10) {
        showToast(`You are running low on AI actions for today`, "warning");
      }
      if (aiActionsRemaining <= 0) {
        showToast(
          "You've reached your daily AI action limit. Try another method.",
          "error"
        );
        setIsUploadingReceipt(false);
        return;
      }
      if (!response.data.matches.length) {
        showToast("No matching items found on receipt", "info");
      } else {
        showToast(
          `Found ${response.data.matches.length} matching items`,
          "success"
        );
        setReceiptMatches(response.data.matches);
      }
      const remainingActions = aiActionsRemaining - 1;
      setAiActionsRemaining(remainingActions);
    } catch (error) {
      throw error;
    } finally {
      setIsUploadingReceipt(false);
    }
  };

  const handleItemPhotoProcessing = async (imageData: string) => {
    try {
      const response = await processShoppingItemPhoto(imageData);
      if (aiActionsRemaining === 10) {
        showToast(`You are running low on AI actions for today`, "warning");
      }
      if (aiActionsRemaining <= 0) {
        showToast(
          "You've reached your daily AI action limit. Try another method.",
          "error"
        );
        return;
      }
      setNewItemFromPhoto(response.data.suggestedName);
      if (response.data.exists) {
        setMatches(response.data.matches);
      } else {
        // No matches, open add form with suggested name
        handleNoMatch();
      }
      const remainingActions = aiActionsRemaining - 1;
      setAiActionsRemaining(remainingActions);
    } catch (error) {
      throw error;
    }
  };

  const handleAddItem = async (formData: ShoppingListFormData) => {
    if (items.length >= 200) {
      showToast(
        "Shopping list limit reached. Maximum 200 items allowed.",
        "error"
      );
      return;
    }
    try {
      const response = await addShoppingListItem(formData);
      const existingItemIndex = items.findIndex(
        (item) =>
          item.item_name.toLowerCase() === formData.item_name.toLowerCase()
      );

      if (existingItemIndex !== -1) {
        setItems((prev) =>
          prev.map((item, index) =>
            index === existingItemIndex ? response.data : item
          )
        );
      } else {
        setItems((prev) => [response.data, ...prev]);
        setSelectedItems((prev) => {
          const newSet = new Set(Array.from(prev));
          newSet.add(response.data.id);
          return newSet;
        });
      }

      setIsFormOpen(false);
      showToast("Item added successfully!", "success");
    } catch (error) {
      showToast("Error adding item. Please try again.", "error");
    }
  };

  const handleMultiAddToInventory = async (multiItems: any[]) => {
    try {
      await addMultiItemsToInventory(multiItems);
      await loadShoppingList();
    } catch (error) {
      showToast("Failed to add items to inventory", "error");
      console.error("Error adding to inventory:", error);
    }
  };

  const handleUpdateItem = async (formData: ShoppingListFormData) => {
    if (!editingItem) return;
    try {
      const response = await updateShoppingListItem(editingItem.id, formData);
      if (response.data.message?.includes("removed")) {
        setItems((prev) => prev.filter((item) => item.id !== editingItem.id));
      } else {
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
      await deleteShoppingListItem(deleteItem.id, deleteItem.quantity);
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
      setDeleteItem(null);
    } catch (error) {
      showToast("Failed to delete item", "error");
      console.error("Error deleting item:", error);
    }
  };

  const handleMoveToInventory = async (
    itemId: number,
    expirationDate: string
  ) => {
    try {
      await moveToInventory(itemId, expirationDate);
      showToast("Item moved to inventory successfully", "success");
      setItems((prev) => prev.filter((item) => item.id !== itemId));
      setEditingItem(null);
    } catch (error) {
      showToast("Error moving item to inventory", "error");
    }
  };

  if (isLoading) {
    return (
      <div className="loading-container">
        <AnimatedTechIcon size={100} speed={4} />
      </div>
    );
  }

  const handleNoMatch = () => {
    setIsFormOpen(true);
    setMatches(null);
  };

  if (receiptMatches) {
    return (
      <ReceiptMatchesModal
        matches={receiptMatches}
        onClose={() => setReceiptMatches(null)}
        onAddToInventory={handleMultiAddToInventory}
      />
    );
  }

  if (matches) {
    return (
      <MatchSelectionModal
        matches={matches}
        onSelect={(item) => {
          setEditingItem(item);
          setMatches(null);
        }}
        onNoMatch={handleNoMatch}
        onClose={() => setMatches(null)}
      />
    );
  }

  if (showPreview) {
    return (
      <div
        className="inventory-container"
        style={{ marginBottom: 150, marginTop: 50 }}>
        <SharedListPreview
          items={items.filter((item) => selectedItems.has(item.id))}
          onBack={() => setShowPreview(false)}
        />
      </div>
    );
  }

  return (
    <div
      className="inventory-container"
      style={{ marginBottom: 150, marginTop: 50 }}>
      <div className="inventory-header">
        <h1>Shopping List</h1>
        <div className="multi-button-list">
          <button
            onClick={() => setIsItemPhotoModalOpen(true)}
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
          <button
            onClick={() => setIsReceiptModalOpen(true)}
            className="add-item-button-list"
            disabled={isUploadingReceipt}
            style={{ backgroundColor: "var(--primary-color)" }}>
            <>
              <FaReceipt />
              <span>Update list from Receipt</span>
            </>
          </button>
          <button
            onClick={handleShareList}
            className="add-item-button-list"
            disabled={selectedItems.size === 0}
            style={{
              backgroundColor:
                selectedItems.size === 0 ? "grey" : "var(--primary-color)",
            }}>
            <FaShare /> Share List
          </button>
          <button
            onClick={() => setShowPreview(true)}
            className="add-item-button-list"
            disabled={selectedItems.size === 0}
            style={{
              backgroundColor:
                selectedItems.size === 0 ? "grey" : "var(--primary-color)",
            }}>
            <FaEye /> Preview Shared List
          </button>
        </div>
      </div>
      <div
        style={{
          backgroundColor: "rgba(5, 71, 42, 0.1)",
          padding: "12px 20px",
          borderRadius: "8px",
          marginTop: "-22px",
          fontSize: "0.9rem",
          color: "var(--text-color)",
          maxWidth: "850px",
          margin: "20px auto",
        }}>
        NOTE: Uncheck items to exclude from your shared shopping list.
      </div>
      <SearchInput
        items={items.map((item) => ({
          ...item,
          name: item.item_name,
        }))}
        onSearch={handleSearch}
        placeholder="Search your shopping list..."
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
                <div className="card-header-content">
                  <div className="checkbox-container">
                    <input
                      type="checkbox"
                      checked={selectedItems.has(item.id)}
                      onChange={() => handleToggleSelect(item.id)}
                      className="item-checkbox"
                    />
                    <h3 className="card-title">{item.item_name}</h3>
                  </div>
                </div>
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
        <ShoppingListForm
          item={editingItem}
          onSubmit={editingItem ? handleUpdateItem : handleAddItem}
          onClose={() => {
            setIsFormOpen(false);
            setEditingItem(null);
          }}
          onMoveToInventory={handleMoveToInventory}
          newItemFromPhoto={newItemFromPhoto}
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
        isOpen={isReceiptModalOpen}
        onClose={() => setIsReceiptModalOpen(false)}
        apiFunction={handleReceiptProcessing}
      />

      <PhotoCaptureModal
        isOpen={isItemPhotoModalOpen}
        onClose={() => setIsItemPhotoModalOpen(false)}
        apiFunction={handleItemPhotoProcessing}
      />

      <ShareableListModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        items={items.map((item) => ({
          ...item,
          isSelected: selectedItems.has(item.id),
        }))}
        setIsLoading={setIsLoading}
      />
    </div>
  );
};

export default ShoppingList;
