export interface User {
  id: number;
  name: string;
  username: string;
  email: string;
  avatar: string;
  bio: string;
  city?: string | null;
  state?: string | null;
}

export interface Recipe {
  id: number;
  category: string;
  item: string;
  description: string;
  confidence: number;
  rating: number;
}