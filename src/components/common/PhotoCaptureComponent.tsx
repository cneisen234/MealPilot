import React, { useState, useRef, useCallback, useEffect } from "react";
import Webcam from "react-webcam";
import { FaCamera, FaUpload, FaTimes } from "react-icons/fa";
import AnimatedTechIcon from "./AnimatedTechIcon";

interface PhotoCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  apiFunction: (imageData: string) => Promise<any>;
}

const PhotoCaptureModal: React.FC<PhotoCaptureModalProps> = ({
  isOpen,
  onClose,
  apiFunction,
}) => {
  const [mode, setMode] = useState<"select" | "camera">("select");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCameraAvailable, setIsCameraAvailable] = useState<boolean | null>(
    null
  );
  const webcamRef = useRef<Webcam>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const checkCamera = async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const hasCamera = devices.some(
          (device) => device.kind === "videoinput"
        );

        if (hasCamera) {
          try {
            const stream = await navigator.mediaDevices.getUserMedia({
              video: { facingMode: "environment" },
            });
            stream.getTracks().forEach((track) => track.stop());
            setIsCameraAvailable(true);
          } catch (err) {
            console.error("Camera permission denied:", err);
            setIsCameraAvailable(false);
          }
        } else {
          setIsCameraAvailable(false);
        }
      } catch (err) {
        console.error("Error checking camera:", err);
        setIsCameraAvailable(false);
      }
    };

    if (isOpen) {
      checkCamera();
    }
  }, [isOpen]);

  const handleCameraCapture = useCallback(async () => {
    if (!webcamRef.current) return;

    const imageSrc = webcamRef.current.getScreenshot();
    if (!imageSrc) {
      setError("Failed to capture photo");
      return;
    }

    setIsLoading(true);
    try {
      await apiFunction(imageSrc);
      onClose();
    } catch (err) {
      setError("Failed to process photo");
    } finally {
      setIsLoading(false);
    }
  }, [apiFunction, onClose]);

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setError("Image size must be less than 5MB");
      return;
    }

    setIsLoading(true);
    try {
      const imageData = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.readAsDataURL(file);
      });

      await apiFunction(imageData);
      onClose();
    } catch (err) {
      setError("Failed to process photo");
    } finally {
      setIsLoading(false);
    }
  };

  if (!isCameraAvailable && isOpen) {
    return (
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(0, 0, 0, 0.5)",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          zIndex: 1000,
        }}>
        <div
          style={{
            background: "var(--surface-color)",
            borderRadius: "15px",
            padding: "20px",
            width: "90%",
            maxWidth: "400px",
            position: "relative",
          }}>
          <div
            style={{
              textAlign: "center",
              marginBottom: "24px",
              position: "relative",
            }}>
            <h2 style={{ margin: 0 }}>Upload Photo</h2>
            <button
              onClick={onClose}
              style={{
                position: "absolute",
                right: "-10px",
                top: "-10px",
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: "8px",
              }}>
              <FaTimes />
            </button>
          </div>
          {isLoading ? (
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                padding: "20px",
              }}>
              <AnimatedTechIcon size={64} speed={4} />
            </div>
          ) : (
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                padding: "20px",
              }}>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="recipe-action-button back-button">
                <FaUpload /> Upload Photo
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    setIsLoading(true);
                    handleFileUpload(e);
                  }}
                  style={{ display: "none" }}
                />
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (!isOpen) return null;

  const renderContent = () => {
    if (isLoading) {
      return (
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            padding: "20px",
          }}>
          <AnimatedTechIcon size={64} speed={4} />
        </div>
      );
    }

    switch (mode) {
      case "select":
        return (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "16px",
              alignItems: "center",
              padding: "20px",
            }}>
            <button
              onClick={() => setMode("camera")}
              className="recipe-action-button back-button">
              <FaCamera /> Take Photo
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="recipe-action-button back-button">
              <FaUpload /> Upload Photo
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={(e) => {
                  setIsLoading(true);
                  handleFileUpload(e);
                }}
                style={{ display: "none" }}
              />
            </button>
          </div>
        );

      case "camera":
        return (
          <div
            style={{
              width: "100%",
              maxWidth: "400px",
              margin: "0 auto",
            }}>
            <Webcam
              audio={false}
              ref={webcamRef}
              screenshotQuality={1}
              screenshotFormat="image/jpeg"
              videoConstraints={{
                width: 1080,
                height: 1920,
                facingMode: "environment",
              }}
              style={{
                width: "100%",
                height: "auto",
                borderRadius: "8px",
              }}
            />
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                gap: "12px",
                marginTop: "16px",
              }}>
              <button
                onClick={handleCameraCapture}
                className="recipe-action-button back-button">
                <FaCamera /> Capture
              </button>
            </div>
          </div>
        );
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 1000,
      }}>
      <div
        style={{
          background: "var(--surface-color)",
          borderRadius: "15px",
          padding: "20px",
          width: "90%",
          maxWidth: "400px",
          position: "relative",
        }}>
        <div
          style={{
            textAlign: "center",
            marginBottom: "24px",
            position: "relative",
          }}>
          <h2 style={{ margin: 0 }}>Take or Upload Photo</h2>
          <button
            onClick={onClose}
            style={{
              position: "absolute",
              right: "-10px",
              top: "-10px",
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: "8px",
            }}>
            <FaTimes />
          </button>
        </div>

        {error && (
          <div
            style={{
              backgroundColor: "#dc3545",
              color: "white",
              padding: "12px",
              borderRadius: "8px",
              marginBottom: "20px",
            }}>
            {error}
          </div>
        )}

        {renderContent()}
      </div>
    </div>
  );
};

export default PhotoCaptureModal;
