import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

// This allows cookies (JWT) to be sent automatically
axios.defaults.withCredentials = true;

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check if user is already logged in when the app starts
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await axios.get(`${import.meta.env.VITE_AUTH_API_URL || 'http://localhost:5000'}/api/auth/me`);
        setUser(res.data.user);
      } catch (err) {
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    checkAuth();
  }, []);

  const signup = async (name, email, password) => {
    try {
      const res = await axios.post(`${import.meta.env.VITE_AUTH_API_URL || 'http://localhost:5000'}/api/auth/signup`, {
        username: name,
        email,
        password
      });
      return res.data.success;
    } catch (error) {
      alert(error.response?.data?.message || "Signup Failed!");
      return false;
    }
  };

  const login = async (email, password) => {
    try {
      const res = await axios.post(`${import.meta.env.VITE_AUTH_API_URL || 'http://localhost:5000'}/api/auth/login`, { email, password });
      if (res.data.success) {
        setUser(res.data.user);
        return true;
      }
      return false;
    } catch (error) {
      alert(error.response?.data?.message || "Login Failed!");
      return false;
    }
  };

  const logout = async () => {
    try {
      await axios.post(`${import.meta.env.VITE_AUTH_API_URL || 'http://localhost:5000'}/api/auth/logout`);
    } catch (err) { 
      console.error(err); 
    } finally {
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, signup, login, logout, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
