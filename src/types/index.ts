export interface User {
  id: number;
  name: string;
  username: string;
  avatar: string;
  bio: string;
  interests: Interest[];
}

export interface Recommendation {
  category: string;
  recommendation: string;
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
}