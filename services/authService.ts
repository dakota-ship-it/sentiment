import { User } from '../types';

const USER_KEY = 'cw_user';

export const authService = {
  login: async (email: string): Promise<User> => {
    // Simulating API delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const storedUserStr = localStorage.getItem(USER_KEY);
    if (storedUserStr) {
      const storedUser = JSON.parse(storedUserStr);
      if (storedUser.email === email) {
        return storedUser;
      }
    }
    
    // For demo purposes, if no user exists, we create one on login if it looks like an email
    if (email.includes('@')) {
      const newUser = { email, name: email.split('@')[0] };
      localStorage.setItem(USER_KEY, JSON.stringify(newUser));
      return newUser;
    }

    throw new Error("Invalid credentials");
  },

  signup: async (email: string, name: string): Promise<User> => {
    await new Promise(resolve => setTimeout(resolve, 500));
    const newUser = { email, name };
    localStorage.setItem(USER_KEY, JSON.stringify(newUser));
    return newUser;
  },

  logout: async (): Promise<void> => {
    localStorage.removeItem(USER_KEY);
  },

  getCurrentUser: (): User | null => {
    const stored = localStorage.getItem(USER_KEY);
    return stored ? JSON.parse(stored) : null;
  }
};
