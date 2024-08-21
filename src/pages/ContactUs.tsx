import React, { useEffect, useState } from "react";
import { getProfile, sendContactForm } from "../utils/api";

const ContactUs: React.FC = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState("");

  useEffect(() => {
    fetchCurrentUser();
  }, []);

  const fetchCurrentUser = async () => {
    try {
      const response = await getProfile();
      setName(response.data.name);
      setEmail(response.data.email);
    } catch (error) {
      console.error("Error fetching current user:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("Sending...");
    try {
      await sendContactForm({ name, email, subject, message });
      setStatus("Message sent successfully!");
      setName("");
      setEmail("");
      setSubject("");
      setMessage("");
    } catch (error) {
      setStatus("Failed to send message. Please try again.");
    }
  };

  return (
    <div className="center-container">
      <div className="content-wrapper">
        <div className="auth-form">
          <h2>Contact Us</h2>
          <p>
            We'd love to hear from you! Send us your feedback, report bugs, or
            ask questions.
          </p>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <input
                type="text"
                className="form-control"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Subject"
                required
              />
            </div>
            <div className="form-group">
              <textarea
                className="form-control"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Your Message"
                rows={5}
                required></textarea>
            </div>
            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: "100%" }}>
              Send Message
            </button>
          </form>
          {status && <p className="mt-3 text-center">{status}</p>}
        </div>
      </div>
    </div>
  );
};

export default ContactUs;
