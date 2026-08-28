import React, { createContext, useContext, useState, useEffect } from 'react';
import { authApi } from '../api/authApi';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('hms_user');
    try {
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [token, setToken] = useState(() => localStorage.getItem('hms_token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem('hms_token');
      if (storedToken) {
        try {
          const userData = await authApi.getMe();
          setUser(userData);
          localStorage.setItem('hms_user', JSON.stringify(userData));
        } catch (err) {
          console.error("Auth verification failed:", err);
          logout();
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const login = async (credentials, remember = true) => {
    const data = await authApi.login(credentials);
    localStorage.setItem('hms_remember_me', remember ? 'true' : 'false');
    localStorage.setItem('hms_token', data.access_token);
    localStorage.setItem('hms_user', JSON.stringify(data.user));
    setToken(data.access_token);
    setUser(data.user);
    return data.user;
  };

  const signup = async (userData) => {
    const data = await authApi.signup(userData);
    localStorage.setItem('hms_remember_me', 'true');
    localStorage.setItem('hms_token', data.access_token);
    localStorage.setItem('hms_user', JSON.stringify(data.user));
    setToken(data.access_token);
    setUser(data.user);
    return data.user;
  };

  const logout = () => {
    localStorage.removeItem('hms_token');
    localStorage.removeItem('hms_user');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
