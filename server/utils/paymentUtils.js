const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const pool = require("../db");
const { getUserByStripeCustomerId } = require("../utils/userUtils");
const {
  sendSubscriptionConfirmation,
  sendAdminNotification,
} = require("../utils/emailUtils");

const PaymentTier = {
  Owner: 1,
  Premium: 2,
  Basic: 3,
  Free: 4,
};

const attachPaymentMethodToCustomer = async (customerId, paymentMethodId) => {
  await stripe.paymentMethods.attach(paymentMethodId, { customer: customerId });
  await stripe.customers.update(customerId, {
    invoice_settings: { default_payment_method: paymentMethodId },
  });
};

const cancelExistingSubscription = async (customerId) => {
  const subscriptions = await stripe.subscriptions.list({
    customer: customerId,
    status: "active",
    limit: 1,
  });

  if (subscriptions.data.length > 0) {
    await stripe.subscriptions.cancel(subscriptions.data[0].id);
  }
};

const createNewSubscription = async (customerId, priceId) => {
  return await stripe.subscriptions.create({
    customer: customerId,
    items: [{ price: priceId }],
    proration_behavior: "create_prorations",
  });
};

async function createNewSubscriptionWithTrial(customerId, priceId) {
  const oneMonthFromNow = Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60; // 30 days from now
  return await stripe.subscriptions.create({
    customer: customerId,
    items: [{ price: priceId }],
    trial_end: oneMonthFromNow,
    proration_behavior: "none",
  });
}

const calculateProratedAmount = (
  daysLeft,
  totalDays,
  currentPrice,
  newPrice
) => {
  const percentageRemaining = daysLeft / totalDays;

  console.log("percentageRemaining", percentageRemaining);
  console.log("daysLeft", daysLeft);
  console.log("totalDays", totalDays);
  console.log("currentPrice", currentPrice);
  console.log("newPrice", newPrice);

  // Calculate the prorated amount of the current plan
  const proratedCurrentPrice =
    Math.ceil(currentPrice * percentageRemaining) / 100;

  console.log("proratedCurrentPrice", proratedCurrentPrice);

  const formattedNewPrice = Number(newPrice) / 100;

  console.log("formattedNewPrice", formattedNewPrice);

  // Calculate the amount to charge (new price minus prorated current price)
  let amountToCharge = Math.max(
    0,
    formattedNewPrice - proratedCurrentPrice
  ).toFixed(2);

  amountToCharge = Number(amountToCharge) * 100;

  console.log("amountToCharge", amountToCharge);

  return {
    proratedAmount: Number(amountToCharge),
    daysRemaining: daysLeft,
    percentageRemaining: (percentageRemaining * 100).toFixed(2) + "%",
  };
};

const checkPaymentTier = async (userId, requiredTier) => {
  const result = await pool.query(
    "SELECT payment_tier FROM users WHERE id = $1",
    [userId]
  );
  if (result.rows.length === 0) {
    throw new Error("User not found");
  }
  return PaymentTier[result.rows[0].payment_tier] <= requiredTier;
};

async function cancelScheduledDowngrade(userId) {
  const query = "DELETE FROM scheduled_downgrades WHERE user_id = $1";
  await pool.query(query, [userId]);
}

async function updateUserSubscription(userId, newTier, stripeSubscriptionId) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Convert the numeric tier to its string representation
    const tierString = Object.keys(PaymentTier).find(
      (key) => PaymentTier[key] === newTier
    );

    // Update the user's payment tier and subscription_updated_at
    const updateUserQuery = `
      UPDATE users 
      SET payment_tier = $1, 
          subscription_updated_at = NOW(), 
          stripe_subscription_id = $2
      WHERE id = $3
      RETURNING *
    `;
    const userResult = await client.query(updateUserQuery, [
      tierString,
      stripeSubscriptionId,
      userId,
    ]);

    if (userResult.rows.length === 0) {
      throw new Error("User not found");
    }

    const updatedUser = userResult.rows[0];

    // Try to log the subscription change, but don't fail if the table doesn't exist
    try {
      const logSubscriptionChangeQuery = `
        INSERT INTO subscription_logs (user_id, old_tier, new_tier, changed_at)
        VALUES ($1, $2, $3, NOW())
      `;
      await client.query(logSubscriptionChangeQuery, [
        userId,
        PaymentTier[updatedUser.payment_tier],
        tierString,
      ]);
    } catch (logError) {
      console.warn("Failed to log subscription change:", logError.message);
      // Continue execution even if logging fails
    }

    // Update user privileges based on the new tier
    const updatePrivilegesQuery = `
      INSERT INTO user_privileges (user_id, max_interests, max_friends)
      VALUES ($1, 
        CASE 
          WHEN $2 = 'Premium' THEN 20 
          WHEN $2 = 'Basic' THEN 10 
          ELSE 3
        END,
        CASE 
          WHEN $2 = 'Premium' THEN 9999 
          WHEN $2 = 'Basic' THEN 10 
          ELSE 0
        END)
      ON CONFLICT (user_id) 
      DO UPDATE SET
        max_interests = CASE 
          WHEN $2 = 'Premium' THEN 20 
          WHEN $2 = 'Basic' THEN 10 
          ELSE user_privileges.max_interests 
        END,
        max_friends = CASE 
          WHEN $2 = 'Premium' THEN 9999 
          WHEN $2 = 'Basic' THEN 10 
          ELSE user_privileges.max_friends 
        END
    `;
    await client.query(updatePrivilegesQuery, [userId, tierString]);

    await client.query("COMMIT");

    console.log(`User ${userId} subscription updated to ${tierString}`);
    return updatedUser;
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error updating user subscription:", error);
    throw error;
  } finally {
    client.release();
  }
}

async function handleSuccessfulPayment(invoice) {
  console.log("Payment succeeded:", invoice.id);

  try {
    const user = await getUserByStripeCustomerId(invoice.customer);
    if (!user) {
      throw new Error("User not found for Stripe customer");
    }

    // Update user's subscription status if necessary
    // await updateUserSubscriptionStatus(user.id, "active");

    // Send confirmation email to the user
    const amount = (invoice.amount_paid / 100).toFixed(2); // Convert cents to dollars
    const date = new Date(invoice.created * 1000).toLocaleDateString();
    await sendSubscriptionConfirmation(user.email, amount, date);

    console.log(`Successful payment processed for user ${user.id}`);
  } catch (error) {
    console.error("Error handling successful payment:", error);
    await sendAdminNotification(
      "Error handling successful payment",
      `Invoice ${invoice.id}: ${error.message}`
    );
  }
}

async function handleFailedPayment(invoice) {
  console.log("Payment failed:", invoice.id);

  try {
    const user = await getUserByStripeCustomerId(invoice.customer);
    if (!user) {
      throw new Error("User not found for Stripe customer");
    }

    // Update user's subscription status
    // await updateUserSubscriptionStatus(user.id, "past_due");

    // Send notification to admin
    await sendAdminNotification(
      "Payment failed",
      `Invoice ${invoice.id} payment failed for user ${user.id} (${user.email})`
    );

    console.log(`Failed payment recorded for user ${user.id}`);
  } catch (error) {
    console.error("Error handling failed payment:", error);
    await sendAdminNotification(
      "Error handling failed payment",
      `Invoice ${invoice.id}: ${error.message}`
    );
  }
}

// const calculateTax = async (amount, customerId) => {
//   try {
//     const taxCalculation = await stripe.tax.calculations.create({
//       currency: "usd",
//       line_items: [
//         {
//           amount: amount,
//           reference: "Subscription",
//         },
//       ],
//       customer: customerId,
//     });

//     return {
//       taxAmount: taxCalculation.tax_amount_exclusive,
//       totalAmount: taxCalculation.total_amount,
//     };
//   } catch (error) {
//     console.error("Error calculating tax:", error);
//     throw new Error("Failed to calculate tax");
//   }
// };

module.exports = {
  attachPaymentMethodToCustomer,
  cancelExistingSubscription,
  createNewSubscription,
  createNewSubscriptionWithTrial,
  calculateProratedAmount,
  checkPaymentTier,
  cancelScheduledDowngrade,
  updateUserSubscription,
  handleSuccessfulPayment,
  handleFailedPayment,
  // calculateTax,
};
