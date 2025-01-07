import React, { useState, useEffect, useRef } from "react";
import {
  FaPlus,
  FaPencilAlt,
  FaTrash,
  FaTags,
  FaReceipt,
  FaShare,
} from "react-icons/fa";
import AnimatedTechIcon from "../components/common/AnimatedTechIcon";
import ConfirmationModal from "../components/common/ConfirmationModal";
import ShoppingListForm from "../components/shoppingList/shoppingListForm";
import {
  getShoppingList,
  addShoppingListItem,
  updateShoppingListItem,
  deleteShoppingListItem,
  moveToInventory,
  addMultiItemsToInventory,
  processReceipt,
} from "../utils/api";
import "../styles/inventory.css";
import ReceiptMatchesModal from "../components/shoppingList/ReceiptMatchesModal";
import ShareableListModal from "../components/shoppingList/SharableListModal";

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
  const [items, setItems] = useState<ShoppingListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ShoppingListItem | null>(null);
  const [deleteItem, setDeleteItem] = useState<ShoppingListItem | null>(null);
  const [isUploadingReceipt, setIsUploadingReceipt] = useState(false);
  const [receiptMatches, setReceiptMatches] = useState<any[] | null>(null);
  const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set());
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    loadShoppingList();
  }, []);

  useEffect(() => {
    if (items.length > 0) {
      setSelectedItems(new Set(items.map((item) => item.id)));
    } else {
      setSelectedItems(new Set());
    }
  }, [items]);

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
    } catch (error) {
      setError("Failed to load shopping list items");
      console.error("Error loading shopping list:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReceiptUpload = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setError("Receipt image must be less than 5MB");
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        setIsUploadingReceipt(true);
        const response = await processReceipt(event.target?.result as string);
        if (response.data.matches.length === 0) {
          setError("No matching items found on receipt");
        } else {
          setReceiptMatches(response.data.matches);
        }
      } catch (error) {
        setError("Failed to process receipt. Please try again.");
        console.error("Error processing receipt:", error);
      } finally {
        setIsUploadingReceipt(false);
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      }
    };

    reader.readAsDataURL(file);
  };

  const handleAddItem = async (formData: ShoppingListFormData) => {
    try {
      const response = await addShoppingListItem(formData);

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

  const handleMultiAddToInventory = async (multiItems: any[]) => {
    try {
      await addMultiItemsToInventory(multiItems);
      // Refresh shopping list after adding to inventory
      await loadShoppingList();
    } catch (error) {
      setError("Failed to add items to inventory");
      console.error("Error adding to inventory:", error);
    }
  };

  const handleUpdateItem = async (formData: ShoppingListFormData) => {
    if (!editingItem) return;
    try {
      const response = await updateShoppingListItem(editingItem.id, formData);
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
      await deleteShoppingListItem(deleteItem.id, deleteItem.quantity);
      setItems((prev) => prev.filter((item) => item.id !== deleteItem.id));
      setDeleteItem(null);
    } catch (error) {
      setError("Failed to delete item");
      console.error("Error deleting item:", error);
    }
  };

  const handleMoveToInventory = async (
    itemId: number,
    expirationDate: string
  ) => {
    try {
      await moveToInventory(itemId, expirationDate);
      setItems((prev) => prev.filter((item) => item.id !== itemId));
      setEditingItem(null);
    } catch (error) {
      setError("Failed to move item to inventory");
      console.error("Error moving item to inventory:", error);
    }
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
        <h1>Shopping List</h1>
        <div className="multi-button-list">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleReceiptUpload}
            accept="image/*"
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="scan-receipt-button"
            disabled={isUploadingReceipt}>
            {isUploadingReceipt ? (
              <div className="flex items-center gap-2">
                <AnimatedTechIcon size={20} speed={4} />
                <span>Processing Receipt...</span>
              </div>
            ) : (
              <>
                <FaReceipt />
                <span>Upload Photo of Receipt</span>
              </>
            )}
          </button>
          <button
            onClick={() => setIsFormOpen(true)}
            className="scan-receipt-button"
            style={{ backgroundColor: "var(--primary-color)" }}>
            <FaPlus /> Add Item
          </button>
          <button
            onClick={handleShareList}
            className="scan-receipt-button"
            style={{ backgroundColor: "var(--primary-color)" }}>
            <FaShare /> Share List
          </button>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="list-grid">
        {items.map((item) => (
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

            <div className="card-content">
              <div className="quantity-info">QTY: {item.quantity}</div>

              {item.tagged_recipes.length > 0 &&
                item.tagged_recipes[0].id !== null && (
                  <div className="recipe-tags">
                    <div className="tagged-recipes-header">
                      <FaTags /> For recipes:
                    </div>
                    {item.tagged_recipes
                      .filter((r) => r.id)
                      .map((recipe) => (
                        <div key={recipe.id} className="recipe-tag">
                          {recipe.title}
                        </div>
                      ))}
                  </div>
                )}
            </div>
          </div>
        ))}
      </div>

      {(isFormOpen || editingItem) && (
        <ShoppingListForm
          item={editingItem}
          onSubmit={editingItem ? handleUpdateItem : handleAddItem}
          onClose={() => {
            setIsFormOpen(false);
            setEditingItem(null);
          }}
          onMoveToInventory={handleMoveToInventory}
        />
      )}

      {deleteItem && (
        <ConfirmationModal
          message={`Are you sure you want to delete "${deleteItem.item_name}"?`}
          onConfirm={handleDeleteItem}
          onClose={() => setDeleteItem(null)}
        />
      )}
      {receiptMatches && (
        <ReceiptMatchesModal
          matches={receiptMatches}
          onClose={() => setReceiptMatches(null)}
          onAddToInventory={handleMultiAddToInventory}
        />
      )}

      <ShareableListModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        items={items.map((item) => ({
          ...item,
          isSelected: selectedItems.has(item.id),
        }))}
        onMoveToInventory={handleMultiAddToInventory}
      />
    </div>
  );
};

export default ShoppingList;
