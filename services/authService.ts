
import { User } from '../types';

// Mock authentication service
// In a real app, this would interact with a backend API.

export const authService = {
  login: async (email: string, password: string, users: User[]): Promise<User | null> => {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const user = users.find(u => u.email === email);

    if (user && user.password === password) { // IMPORTANT: Passwords should be hashed and compared securely in a real app!
      // Return the full user object. The application state needs the password
      // to be able to export the complete users.json file correctly.
      return user;
    }
    return null;
  },

  logout: (): void => {
    // In a real app, this might clear tokens from localStorage/sessionStorage or call a backend logout endpoint.
    console.log('User logged out');
  },

  // Example for creating a user (admin might use this)
  // This should ideally be in a userService, but for simplicity here.
  createUser: async (userData: Omit<User, 'id'>, existingUsers: User[]): Promise<User | null> => {
    await new Promise(resolve => setTimeout(resolve, 500));
    if (existingUsers.find(u => u.email === userData.email)) {
      throw new Error("User with this email already exists.");
    }
    const newUser: User = {
      ...userData,
      id: `user_${new Date().getTime()}_${Math.random().toString(16).slice(2)}`,
      // Ensure password is set, even if it's a mock one for now
      password: userData.password || "defaultPassword123", // HASH THIS IN REAL APP
    };
    // This function only simulates creation, actual addition to state is done in DataContext
    return newUser; 
  }
};