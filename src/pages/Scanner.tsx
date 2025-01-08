import { useState } from "react";
import BarcodeScannerComponent from "react-qr-barcode-scanner";
import AnimatedTechIcon from "../components/common/AnimatedTechIcon";
import {
  checkItemInventory,
  deleteInventoryItemByName,
  moveToInventoryByName,
  addShoppingListItem,
  updateShoppingListItemByName,
} from "../utils/api";
import decimalHelper from "../helpers/decimalHelper";
import "../styles/scanner.css";

const ScannerPage = () => {
  const [isScanning, setIsScanning] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [scannedItem, setScannedItem] = useState<null | string>(null);
  const [modalType, setModalType] = useState<null | string>(null);
  const [quantity, setQuantity] = useState(1);
  const [expirationDate, setExpirationDate] = useState("");

  const handleUpdate = async (err: any, result: any) => {
    console.log(result);
    if (err) {
      console.error(err);
      return;
    }

    if (!result) return;

    setIsScanning(false);
    setIsLoading(true);

    try {
      const response = await checkItemInventory(result.text);
      setScannedItem(response.data);

      if (response.data.inInventory) {
        setModalType("removeFromInventory");
      } else if (response.data.inShoppingList) {
        setModalType("addToInventory");
      } else {
        setModalType("addToShoppingList");
      }
    } catch (error) {
      console.error("Error processing barcode:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveFromInventory = async () => {
    try {
      //@ts-ignore
      await deleteInventoryItemByName(scannedItem.item_name, quantity);
      resetScanState();
    } catch (error) {
      console.error("Error removing from inventory:", error);
    }
  };

  const handleAddToInventory = async () => {
    try {
      //@ts-ignore
      await moveToInventoryByName(scannedItem.item_name, expirationDate);
      resetScanState();
    } catch (error) {
      console.error("Error adding to inventory:", error);
    }
  };

  const handleAddToShoppingList = async () => {
    try {
      await addShoppingListItem({
        //@ts-ignore
        item_name: scannedItem.item_name,
        quantity,
        recipe_ids: [],
      });
      resetScanState();
    } catch (error) {
      console.error("Error adding to shopping list:", error);
    }
  };

  const resetScanState = () => {
    setModalType(null);
    setScannedItem(null);
    setQuantity(1);
    setExpirationDate("");
    setIsScanning(true);
  };

  const renderModal = () => {
    switch (modalType) {
      case "removeFromInventory":
        return (
          <div className="modal-overlay">
            <div className="modal-content">
              <h2>Update Inventory</h2>
              {/*@ts-ignore */}
              <p>Found {scannedItem.item_name} in your inventory.</p>
              {/*@ts-ignore */}
              <p>Current quantity: {scannedItem.inventoryItem.quantity}</p>

              <div className="form-group">
                <label>New Quantity</label>
                <input
                  type="text"
                  value={quantity}
                  onChange={(e) => decimalHelper(setQuantity, e)}
                  className="form-control"
                />
              </div>

              <div className="form-actions">
                <button
                  onClick={() => {
                    setModalType(null);
                    setIsScanning(true);
                  }}
                  className="cancel-button">
                  Cancel
                </button>
                <button
                  onClick={handleRemoveFromInventory}
                  className="submit-button">
                  Update Quantity
                </button>
                <button
                  onClick={() => {
                    setQuantity(0);
                    handleRemoveFromInventory();
                  }}
                  className="delete-button">
                  Delete Item
                </button>
              </div>
            </div>
          </div>
        );

      case "addToInventory":
        return (
          <div className="modal-overlay">
            <div className="modal-content">
              <h2>Found in Shopping List</h2>
              {/*@ts-ignore */}
              <p>Found {scannedItem.item_name} in your shopping list.</p>
              <p>What would you like to do?</p>

              <div className="form-group">
                <label>Quantity for Inventory</label>
                <input
                  type="text"
                  value={quantity}
                  onChange={(e) => decimalHelper(setQuantity, e)}
                  className="form-control"
                />
              </div>

              <div className="form-group">
                <label>Expiration Date</label>
                <input
                  type="date"
                  value={expirationDate}
                  onChange={(e) => setExpirationDate(e.target.value)}
                  className="form-control"
                />
              </div>

              <div className="form-actions">
                <button
                  onClick={() => {
                    setModalType(null);
                    setIsScanning(true);
                  }}
                  className="cancel-button">
                  Cancel
                </button>
                <button
                  onClick={handleAddToInventory}
                  className="submit-button">
                  Add to Inventory
                </button>
                <button
                  onClick={() => {
                    setQuantity(0);
                    updateShoppingListItemByName({
                      //@ts-ignore
                      item_name: scannedItem.item_name,
                      quantity: 0,
                      recipe_ids: [],
                    });
                    resetScanState();
                  }}
                  className="delete-button">
                  Remove from Shopping List
                </button>
              </div>
            </div>
          </div>
        );

      case "addToShoppingList":
        return (
          <div className="modal-overlay">
            <div className="modal-content">
              <h2>Add Item</h2>
              {/*@ts-ignore */}
              <p>Where would you like to add {scannedItem.item_name}?</p>

              <div className="form-group">
                <label>Quantity</label>
                <input
                  type="text"
                  value={quantity}
                  onChange={(e) => decimalHelper(setQuantity, e)}
                  className="form-control"
                />
              </div>

              <div className="form-group">
                <label>Expiration Date</label>
                <input
                  type="date"
                  value={expirationDate}
                  onChange={(e) => setExpirationDate(e.target.value)}
                  className="form-control"
                />
              </div>

              <div className="form-actions">
                <button
                  onClick={() => {
                    setModalType(null);
                    setIsScanning(true);
                  }}
                  className="cancel-button">
                  Cancel
                </button>
                <button
                  onClick={handleAddToShoppingList}
                  className="submit-button">
                  Add to Shopping List
                </button>
                <button
                  onClick={handleAddToInventory}
                  className="submit-button">
                  Add to Inventory
                </button>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="scanner-container">
      <div className="scanner-header">
        <h1>Barcode Scanner</h1>
        <button
          onClick={() => setIsScanning(!isScanning)}
          className={
            isScanning ? "stop-scanner-button" : "start-scanner-button"
          }>
          {isScanning ? "Stop Scanner" : "Start Scanner"}
        </button>
      </div>

      <div className="scanner-view">
        {isLoading ? (
          <div className="loading-container">
            <AnimatedTechIcon size={100} speed={4} />
          </div>
        ) : isScanning ? (
          <BarcodeScannerComponent
            width={500}
            height={500}
            onUpdate={handleUpdate}
          />
        ) : (
          <div className="scanner-placeholder">
            <p>Click "Start Scanner" to begin scanning</p>
          </div>
        )}
      </div>

      {renderModal()}
    </div>
  );
};

export default ScannerPage;
