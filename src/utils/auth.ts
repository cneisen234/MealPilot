// src/utils/auth.ts

// This is a placeholder for your actual authentication token
let authToken: string | null = null;

// Interface for user data
interface User {
  id: number;
  username: string;
  email: string;
}

// Simulated login function
export const login = async (email: string, password: string): Promise<User> => {
  // This is a placeholder. In a real app, you'd make an API call here.
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (email === 'user@example.com' && password === 'password') {
        const user: User = { id: 1, username: 'exampleUser', email: 'user@example.com' };
        authToken = 'fake-auth-token';
        resolve(user);
      } else {
        reject(new Error('Invalid credentials'));
      }
    }, 1000); // Simulate network delay
  });
};

// Simulated logout function
export const logout = (): void => {
  // In a real app, you might also make an API call here
  authToken = null;
};

// Simulated signup function
export const signup = async (username: string, email: string, password: string): Promise<User> => {
  // This is a placeholder. In a real app, you'd make an API call here.
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (email && password) {
        const user: User = { id: Date.now(), username, email };
        authToken = 'fake-auth-token';
        resolve(user);
      } else {
        reject(new Error('Invalid input'));
      }
    }, 1000); // Simulate network delay
  });
};

// Function to get the current auth token
export const getAuthToken = (): string | null => {
  return authToken;
};

// Function to check if the user is authenticated
export const isAuthenticated = (): boolean => {
  // return authToken !== null;
  return true;
};

// Function to get the current user
export const getCurrentUser = async (): Promise<User | null> => {
  // This is a placeholder. In a real app, you'd make an API call here.
  // return new Promise((resolve) => {
  //   setTimeout(() => {
  //     if (authToken) {
  //       resolve({ id: 1, username: 'exampleUser', email: 'user@example.com' });
  //     } else {
  //       resolve(null);
  //     }
  //   }, 1000);
  // });
  return Promise.resolve({ id: 1, username: 'testUser', email: 'test@example.com'})
};