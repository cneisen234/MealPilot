import axios from 'axios';
import { User, Interest, Recommendation } from '../types';

const API_URL = 'http://localhost:5000/api';

export const getUsers = () => axios.get<User[]>(`${API_URL}/users`);
export const getUserInterests = (userId: number) => axios.get<Interest[]>(`${API_URL}/users/${userId}/interests`);
export const addInterest = (interest: Omit<Interest, 'id'>) => axios.post<Interest>(`${API_URL}/interests`, interest);
export const getRecommendations = (userId: number) => axios.post<Recommendation[]>(`${API_URL}/recommend`, { userId });