import React, { useState } from "react";
import { useStripe, useElements, CardElement } from "@stripe/react-stripe-js";
import { updatePaymentMethod } from "../../utils/api";

interface AddressInfo {
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
}

const UpdatePaymentMethod: React.FC = () => {
  const stripe = useStripe();
  const elements = useElements();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [address, setAddress] = useState<AddressInfo>({
    line1: "",
    line2: "",
    city: "",
    state: "",
    postal_code: "",
    country: "US",
  });

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    const cardElement = elements.getElement(CardElement);

    if (cardElement) {
      const { error, paymentMethod } = await stripe.createPaymentMethod({
        type: "card",
        card: cardElement,
      });

      if (error) {
        setError(error.message || "An error occurred");
      } else {
        try {
          await updatePaymentMethod(paymentMethod.id, address);
          setSuccess(true);
          setError(null);
        } catch (err) {
          setError("Failed to update payment method");
        }
      }
    }
  };

  const handleAddressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAddress({ ...address, [e.target.name]: e.target.value });
  };

  return (
    <div>
      <h2>Update Payment Method</h2>
      <form onSubmit={handleSubmit}>
        <CardElement />
        <div className="form-group" style={{ marginTop: "20px" }}>
          <h4>Billing Address</h4>
          <input
            name="line1"
            className="form-control"
            value={address?.line1}
            onChange={handleAddressChange}
            placeholder="Address Line 1"
            required
          />
          <input
            name="line2"
            className="form-control"
            value={address?.line2}
            onChange={handleAddressChange}
            placeholder="Address Line 2"
          />
          <div style={{ display: "flex", width: "97%" }}>
            <input
              name="city"
              className="form-control"
              value={address?.city}
              onChange={handleAddressChange}
              placeholder="City"
              required
              style={{ flex: 2 }}
            />
            <input
              name="state"
              className="form-control"
              value={address?.state}
              onChange={handleAddressChange}
              placeholder="State"
              required
              style={{ flex: 1 }}
            />
            <input
              name="postal_code"
              className="form-control"
              value={address?.postal_code}
              onChange={handleAddressChange}
              placeholder="Zip Code"
              required
              style={{ flex: 1 }}
            />
          </div>
        </div>
        <button type="submit" disabled={!stripe}>
          Update
        </button>
      </form>
      {error && <div style={{ color: "red" }}>{error}</div>}
      {success && (
        <div style={{ color: "green" }}>
          Payment method updated successfully!
        </div>
      )}
    </div>
  );
};

export default UpdatePaymentMethod;
