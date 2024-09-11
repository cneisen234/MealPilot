const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/auth");
const pool = require("../db");
// const { checkPaymentTier } = require("../utils/paymentUtils");
const { createNotification } = require("../utils/notificationUtils");

// const PaymentTier = {
//   Owner: 1,
//   Premium: 2,
//   Basic: 3,
//   Free: 4,
// };

router.get("/", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;

    // Check if user has access to friends list
    // const hasAccess = await checkPaymentTier(userId, PaymentTier.Basic);
    // if (!hasAccess) {
    //   return res
    //     .status(403)
    //     .json({ message: "Upgrade required to access friends list" });
    // }

    // const query = `
    //   SELECT u.id, u.name, u.username, u.avatar
    //   FROM users u
    //   INNER JOIN friends f ON u.id = f.friend_id
    //   WHERE f.user_id = $1
    // `;

    // const result = await pool.query(query, [userId]);

    // For Basic tier, limit to 10 friends
    // const friends = result.rows.slice(
    //   0,
    //   PaymentTier[req.user.payment_tier] === PaymentTier.Basic ? 10 : undefined
    // );

    res.json(friends);
  } catch (error) {
    console.error("Error fetching friends:", error);
    res.status(500).json({ message: "Server error" });
  }
});

router.get("/:friendId/profile", authMiddleware, async (req, res) => {
  try {
    const { friendId } = req.params;
    const userId = req.user.id;

    // Check if the users are friends
    const friendshipCheck = await pool.query(
      "SELECT * FROM friends WHERE (user_id = $1 AND friend_id = $2) OR (user_id = $2 AND friend_id = $1)",
      [userId, friendId]
    );

    if (friendshipCheck.rows.length === 0) {
      return res
        .status(403)
        .json({ message: "You don't have permission to view this profile" });
    }

    // Fetch friend's profile data
    const friendQuery = await pool.query(
      `SELECT id, name, username, avatar, bio, bio_visibility, interests_visibility
       FROM users WHERE id = $1`,
      [friendId]
    );

    if (friendQuery.rows.length === 0) {
      return res.status(404).json({ message: "Friend not found" });
    }

    const friend = friendQuery.rows[0];

    // Respect privacy settings
    const profile = {
      id: friend.id,
      name: friend.name,
      username: friend.username,
      avatar: friend.avatar,
      bio: friend.bio_visibility === "public" ? friend.bio : null,
      interests: [],
    };

    // Fetch interests if allowed
    if (friend.interests_visibility === "public") {
      const interestsQuery = await pool.query(
        `SELECT i.category, json_agg(json_build_object('name', it.name, 'rating', it.rating)) as items
         FROM interests i
         LEFT JOIN items it ON i.id = it.interest_id
         WHERE i.user_id = $1
         GROUP BY i.id`,
        [friendId]
      );
      profile.interests = interestsQuery.rows;
    }

    res.json(profile);
  } catch (error) {
    console.error("Error fetching friend profile:", error);
    res.status(500).json({ message: "Server error" });
  }
});

router.post("/friend-requests", authMiddleware, async (req, res) => {
  try {
    const senderId = req.user.id; // ID of the user sending the request
    const { receiverId } = req.body; // ID of the user receiving the request

    // Check if a friend request already exists
    const checkQuery =
      "SELECT * FROM friend_requests WHERE sender_id = $1 AND receiver_id = $2";
    const checkResult = await pool.query(checkQuery, [senderId, receiverId]);

    if (checkResult.rows.length > 0) {
      return res.status(400).json({ message: "Friend request already sent" });
    }

    // Get sender's full name
    const senderQuery = "SELECT name FROM users WHERE id = $1";
    const senderResult = await pool.query(senderQuery, [senderId]);
    const senderName = senderResult.rows[0].name;

    // Insert new friend request
    const insertQuery =
      "INSERT INTO friend_requests (sender_id, receiver_id, status) VALUES ($1, $2, 'pending') RETURNING *";
    const insertResult = await pool.query(insertQuery, [senderId, receiverId]);

    // Create a notification for the receiver
    await createNotification(
      receiverId, // Correctly using receiverId here
      `You have a new friend request from ${senderName}`,
      "friend_request"
    );

    res.status(201).json(insertResult.rows[0]);
  } catch (error) {
    console.error("Error sending friend request:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Get friend requests for a user
router.get("/friend-requests", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const query = `
      SELECT fr.id, fr.sender_id, fr.status, u.name, u.username, u.avatar
      FROM friend_requests fr
      JOIN users u ON fr.sender_id = u.id
      WHERE fr.receiver_id = $1 AND fr.status = 'pending'
    `;
    const result = await pool.query(query, [userId]);
    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching friend requests:", error);
    res.status(500).json({ message: "Server error" });
  }
});

router.put("/friend-requests/:id", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // 'accepted' or 'rejected'
    const userId = req.user.id;

    // Update friend request status
    const updateQuery =
      "UPDATE friend_requests SET status = $1 WHERE id = $2 AND receiver_id = $3 RETURNING *";
    const result = await pool.query(updateQuery, [status, id, userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Friend request not found" });
    }

    const friendRequest = result.rows[0];

    // If accepted, add to friends list
    if (status === "accepted") {
      const addFriendQuery =
        "INSERT INTO friends (user_id, friend_id) VALUES ($1, $2), ($2, $1)";
      await pool.query(addFriendQuery, [userId, friendRequest.sender_id]);

      // Get names for both users
      const namesQuery = "SELECT id, name FROM users WHERE id = $1 OR id = $2";
      const namesResult = await pool.query(namesQuery, [
        userId,
        friendRequest.sender_id,
      ]);
      const names = namesResult.rows.reduce(
        (acc, user) => ({ ...acc, [user.id]: user.name }),
        {}
      );

      // Create notifications for both users
      await createNotification(
        userId,
        `You are now friends with ${names[friendRequest.sender_id]}`,
        "friend_accepted"
      );
      await createNotification(
        friendRequest.sender_id,
        `${names[userId]} has accepted your friend request`,
        "friend_accepted"
      );
    }

    res.json({ message: `Friend request ${status}` });
  } catch (error) {
    console.error("Error updating friend request:", error);
    res.status(500).json({ message: "Server error" });
  }
});

router.post("/:friendId/unfriend", authMiddleware, async (req, res) => {
  const { friendId } = req.params;
  const userId = req.user.id;

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Remove the friendship in both directions
    await client.query(
      "DELETE FROM friends WHERE (user_id = $1 AND friend_id = $2) OR (user_id = $2 AND friend_id = $1)",
      [userId, friendId]
    );

    // Remove any pending friend requests between the two users
    await client.query(
      "DELETE FROM friend_requests WHERE (sender_id = $1 AND receiver_id = $2) OR (sender_id = $2 AND receiver_id = $1)",
      [userId, friendId]
    );

    await client.query("COMMIT");

    res.json({ message: "Successfully unfriended user" });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error unfriending user:", error);
    res.status(500).json({ message: "Server error while unfriending user" });
  } finally {
    client.release();
  }
});

module.exports = router;
