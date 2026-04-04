import React, { createContext, useState, useEffect, useContext } from 'react';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check local storage for user simulation
    const storedUser = localStorage.getItem('dsa_user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  const login = (email, password) => {
    // Simple mock check
    const mockUser = { id: 1, email };
    localStorage.setItem('dsa_user', JSON.stringify(mockUser));
    setUser(mockUser);
    return true; // Simulate success
  };

  const signup = (name, email, password) => {
    const mockUser = { id: Date.now(), name, email };
    localStorage.setItem('dsa_user', JSON.stringify(mockUser));
    setUser(mockUser);
    return true; // Simulate success
  };

  const logout = () => {
    localStorage.removeItem('dsa_user');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
