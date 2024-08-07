export interface User {
  id: number;
  name: string;
  username: string;
  avatar: string;
  bio: string;
  bioVisibility: PrivacySetting;
  interests: Interest[];
  interestsVisibility: PrivacySetting;
  friends: Friend[];
  pendingFriendRequests: FriendRequest[];
  city?: string | null;
  state?: string | null;
  paymentTier: PaymentTier;
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
  name: string;
  rating: number;
}

export interface Interest {
  id?: number;
  userId?: number;
  category: string;
  items: Item[];
  visibility: PrivacySetting;
}