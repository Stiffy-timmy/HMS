import axios from 'axios';
import { API_BASE_URL } from '../lib/api';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach JWT token to requests if available (supports both hms_token and access_token keys)
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('hms_token') || localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Intercept 401s to handle logout cleanly without disruptive expired banners
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      const isAuthRoute = error.config.url.includes('/auth/login') || error.config.url.includes('/auth/signup');
      if (!isAuthRoute) {
        localStorage.removeItem('hms_token');
        localStorage.removeItem('access_token');
        localStorage.removeItem('hms_user');
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);
