export interface User {
  id: number;
  name: string;
  username: string;
  email: string;
  avatar: string;
  bio: string;
  bio_visibility: PrivacySetting;
  interests: Interest[];
  interestsVisibility: PrivacySetting;
  friends: Friend[];
  pendingFriendRequests: FriendRequest[];
  city?: string | null;
  state?: string | null;
  payment_tier: PaymentTier;
}

export enum PaymentTier {
  Owner = 1,
  Premium = 2,
  Basic = 3,
  Free = 4,
}

export enum PrivacySetting {
  Public = 'public',
  FriendsOnly = 'friends_only',
  Private = 'private'
}

export interface Friend {
  id: number;
  userId: number;
  friendId: number;
  status: FriendshipStatus;
}

export enum FriendshipStatus {
  Accepted = 'accepted',
  Pending = 'pending',
  Blocked = 'blocked'
}

export interface FriendRequest {
  id: number;
  senderId: number;
  receiverId: number;
  status: FriendRequestStatus;
  createdAt: Date;
}

export enum FriendRequestStatus {
  Pending = 'pending',
  Accepted = 'accepted',
  Rejected = 'rejected'
}

export interface Item {
  id: number;
  name: string;
  rating: number;
}

export interface Interest {
  id: number;
  userId: number;
  category: string;
  visibility: PrivacySetting;
  items: Item[];
}

export interface Notification {
  id: number;
  content: string;
  type: string;
  read: boolean;
  created_at: string;
}