// src/utils/api.ts
import axios, { AxiosInstance, AxiosError, AxiosResponse } from 'axios';
import { FriendRequest, Interest, Item, PaymentTier, User } from '../types';

const url = process.env.NODE_ENV === 'production' 
  ? '/api'
  : 'http://localhost:5000/api';

const api = axios.create({
  baseURL: url,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response: AxiosResponse) => {
    return response;
  },
  (error: AxiosError) => {
    if (error.response) {
      switch (error.response.status) {
        case 401:
          // Unauthorized: clear token and redirect to login
          localStorage.removeItem('token');
          window.location.href = '/login';
          break;
        case 403:
          // Forbidden: you might want to handle this differently
          console.error('Forbidden request:', error.response.data);
          break;
        case 404:
          // Not Found
          console.error('Resource not found:', error.response.data);
          break;
        case 500:
          // Server Error
          console.error('Server error:', error.response.data);
          break;
        default:
          console.error('API error:', error.response.data);
      }
    } else if (error.request) {
      // The request was made but no response was received
      console.error('No response received:', error.request);
    } else {
      // Something happened in setting up the request that triggered an Error
      console.error('Error', error.message);
    }
    return Promise.reject(error);
  }
);

// API methods
export const login = (credentials: { email: string; password: string }) => {
  return api.post('/auth/login', credentials);
};

export const signup = (userData: { name: string; username: string; email: string, password: string; }) => {
  return api.post('/auth/signup', userData);
};

export const getProfile = () => {
  return api.get('/users/profile');
};

export const requestPasswordReset = (email: string) => {
  return api.post('/auth/forgot-password', { email });
};

export const resetPassword = (token: string, password: string) => {
  return api.post(`/auth/reset-password/${token}`, { password });
};

export const sendContactForm = (formData: {
  name: string;
  email: string;
  subject: string;
  message: string;
}) => {
  return api.post('/contact-us', formData);
};

export const closeAccount = (password: string) => {
  return api.post('/close-account', { password });
};

export const updateProfile = async (userId: number, profileData: Partial<User>) => {
  const response = await api.put(`/users/${userId}/profile`, profileData);
  return response.data;
};

export const updateProfilePicture = async (userId: number, base64Image: string) => {
  const response = await api.put(`/users/${userId}/profile-picture`, { avatar: base64Image });
  return response.data;
};

export const addInterestCategory = async (newInterest: Omit<Interest, 'id'>): Promise<Interest> => {
  const response = await api.post<Interest>('/interests', newInterest);
  return response.data;
};

export const addItemToCategory = async (categoryId: number, item: { name: string; rating: number }): Promise<Item> => {
  const response = await api.post<Item>(`/interests/${categoryId}/items`, item);
  return response.data;
};

export const removeItemFromCategory = async (categoryId: number, itemId: number): Promise<void> => {
  await api.delete(`/interests/${categoryId}/items/${itemId}`);
};

export const updateItemRating = async (categoryId: number, itemId: number, newRating: number): Promise<void> => {
  await api.put(`/interests/${categoryId}/items/${itemId}`, { rating: newRating });
};

export const deleteInterestCategory = async (categoryId: number): Promise<void> => {
  await api.delete(`/interests/${categoryId}`);
};

export const getFriends = () => {
  return api.get('/friends');
};

export const getFriendRequests = () => {
  return api.get('/friend-requests');
};

export const handleFriendRequest = (requestId: number, status: 'accepted' | 'rejected') => {
  return api.put(`/friend-requests/${requestId}`, { status });
};

export const sendFriendRequest = (request: Omit<FriendRequest, "id" | "createdAt">) => {
  return api.post('/friend-requests', request);
};

export const getFriendProfile = (friendId: number) => {
  return api.get(`/friends/${friendId}/profile`);
};

export const getNotifications = () => {
  return api.get('/notifications');
};

export const markNotificationAsRead = (notificationId: number) => {
  return api.put(`/notifications/${notificationId}`);
};

export const getInterests = () => {
  return api.get('/interests');
};

export const getUserInterests = (userId: number) => {
   return api.get<Interest[]>(`/users/${userId}/interests`)
};

export const addInterest = (interestData: Omit<Interest, 'id' | 'userId'>) => {
  return api.post('/interests', interestData);
};

export const checkEmailAvailability = (email: string) => {
  return api.get(`/auth/check-email?email=${encodeURIComponent(email)}`);
};

export const checkUsernameAvailability = (username: string) => {
  return api.get(`/auth/check-username?username=${encodeURIComponent(username)}`);
};

export const checkEmailExists = (email: string) => {
  return api.get(`/auth/check-email-exists?email=${encodeURIComponent(email)}`);
};

export const getRecommendation = (query: string, friendIds: number[] = []) => {
  return api.post('/get-recommendation', { query, friendIds });
};

export const getDailyRecommendations = () => {
  return api.get('/recommendations/daily');
};

export const getRemainingPrompts = () => {
  return api.get('/remaining-prompts');
};

export const updatePromptCount = () => {
  return api.post('/update-prompt-count');
};

export const addInterestItemFromChat = (userId: number, category: string, item: string) => {
  return api.post('/interests/add-item-from-chat', { userId, category, item });
};

interface GeolocationResult {
  city: string;
  state: string;
}

export const getUserLocation = (): Promise<GeolocationResult> => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by your browser'));
    } else {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            const { latitude, longitude } = position.coords;
            const response = await axios.post('/api/geocode', { latitude, longitude });
            resolve(response.data);
          } catch (error) {
            reject(new Error('Failed to get location details'));
          }
        },
        () => {
          reject(new Error('Unable to retrieve your location'));
        }
      );
    }
  });
};

export const upgradeUser = (userId: number, newTier: PaymentTier, paymentDetails: any) => {
  return api.post(`/users/${userId}/upgrade`, { newTier, paymentDetails });
};

export const downgradeUser = (userId: number, newTier: PaymentTier) => {
  return api.post(`/users/${userId}/downgrade`, { newTier });
};

export const updatePaymentMethod = async (paymentMethodId: string) => {
  try {
    const response = await api.post('/update-payment-method', { paymentMethodId });
    return response.data;
  } catch (error) {
    // @ts-ignore
    throw error.response?.data?.message || 'An error occurred while updating the payment method';
  }
};

export const getSubscriptionStatus = async () => {
  try {
    const response = await api.get('/subscription-status');
    return response.data;
  } catch (error) {
    // @ts-ignore
    throw error.response?.data?.message || 'An error occurred while fetching subscription status';
  }
};

export default api;

