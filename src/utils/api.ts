// src/utils/api.ts
import axios, { AxiosInstance, AxiosError, AxiosResponse } from 'axios';
import { Interest, User } from '../types';

const url = process.env.NODE_ENV === 'production' 
  ? '/api'
  : 'http://localhost:5000/api';

const api = axios.create({
  baseURL: url,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const testConnection = () => api.get('/test');

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

export const updateProfile = (profileData: Partial<User>) => {
  return api.put('/users/profile', profileData);
};

export const getFriends = () => {
  return api.get('/friends');
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

// Add more API methods as needed

export default api;