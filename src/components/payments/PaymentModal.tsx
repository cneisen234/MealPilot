import { PaymentTier } from "../../types";
import { CardElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { useState } from "react";

interface PaymentModalProps {
  tier: PaymentTier;
  onClose: () => void;
  onConfirm: (paymentDetails: any) => void;
}

const PaymentModal: React.FC<PaymentModalProps> = ({
  tier,
  onClose,
  onConfirm,
}) => {
  const [autoRenew, setAutoRenew] = useState(false);
  const stripe = useStripe();
  const elements = useElements();

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
        console.log("[error]", error);
      } else {
        onConfirm({ paymentMethodId: paymentMethod.id, autoRenew });
      }
    }
  };

  const price = tier === PaymentTier.Basic ? "9.99" : "19.99";
  const today = new Date();
  const nextMonth = new Date(
    today.getFullYear(),
    today.getMonth() + 1,
    today.getDate()
  );

  return (
    <div className="modal">
      <h2>Upgrade to {tier}</h2>
      <p>Price: ${price}/month</p>
      <form onSubmit={handleSubmit}>
        <CardElement />
        <label>
          <input
            type="checkbox"
            checked={autoRenew}
            onChange={() => setAutoRenew(!autoRenew)}
          />
          I agree to monthly automatic renewals
        </label>
        {autoRenew ? (
          <p>
            Your card will be charged ${price} on the {today.getDate()} of each
            month.
          </p>
        ) : (
          <p>
            Your subscription will end on {nextMonth.toLocaleDateString()}. You
            will be moved to the Free tier after this date.
          </p>
        )}
        <p>You can cancel or downgrade your subscription at any time.</p>
        <button type="submit">Confirm Payment</button>
        <button type="button" onClick={onClose}>
          Cancel
        </button>
      </form>
    </div>
  );
};

export default PaymentModal;
