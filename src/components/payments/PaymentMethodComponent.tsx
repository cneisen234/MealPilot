import React, { useState } from "react";
import { useStripe, useElements, CardElement } from "@stripe/react-stripe-js";
import { updatePaymentMethod } from "../../utils/api";

const UpdatePaymentMethod: React.FC = () => {
  // const stripe = useStripe();
  // const elements = useElements();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    // if (!stripe || !elements) {
    //   return;
    // }

    // const cardElement = elements.getElement(CardElement);

    // if (cardElement) {
    //   const { error, paymentMethod } = await stripe.createPaymentMethod({
    //     type: "card",
    //     card: cardElement,
    //   });

    //   if (error) {
    //     setError(error.message || "An error occurred");
    //   } else {
    //     try {
    //       await updatePaymentMethod(paymentMethod.id);
    //       setSuccess(true);
    //       setError(null);
    //     } catch (err) {
    //       setError("Failed to update payment method");
    //     }
    //   }
    // }
  };

  return (
    <div>
      {/* <h2>Update Payment Method</h2>
      <form onSubmit={handleSubmit}>
        <CardElement />
        <button type="submit" disabled={!stripe}>
          Update
        </button>
      </form> */}
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
