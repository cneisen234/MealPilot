import React, { useState } from "react";
import { sendContactForm } from "../utils/api";
import { useAuth } from "../context/AuthContext";
import "../styles/contactus.css";

const ContactUs = () => {
  const { userName, userEmail } = useAuth();
  const [formData, setFormData] = useState({
    name: userName,
    email: userEmail,
    subject: "",
    message: "",
  });
  const [status, setStatus] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setStatus("");

    try {
      await sendContactForm(formData);
      setStatus("Message sent successfully! We'll get back to you soon.");
      setFormData((prev) => ({
        ...prev,
        subject: "",
        message: "",
      }));
    } catch (error) {
      setStatus("Failed to send message. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="contact-container"
      style={{ marginTop: 100, marginBottom: 100 }}>
      <div className="contact-form-wrapper">
        <div className="contact-header">
          <h1>Contact Us</h1>
        </div>
        <br />
        {status && <p className="status-message">{status}</p>}

        <form onSubmit={handleSubmit} className="contact-form">
          <div className="form-group">
            <label htmlFor="subject">Subject</label>
            <input
              type="text"
              id="subject"
              value={formData.subject}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, subject: e.target.value }))
              }
              required
              placeholder="What would you like to discuss?"
            />
          </div>

          <div className="form-group">
            <label htmlFor="message">Message</label>
            <textarea
              id="message"
              rows={5}
              value={formData.message}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, message: e.target.value }))
              }
              required
              placeholder="Share your thoughts, questions, or feedback..."
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className={`submit-button ${isLoading ? "loading" : ""}`}>
            {isLoading ? "Sending..." : "Send Message"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ContactUs;
