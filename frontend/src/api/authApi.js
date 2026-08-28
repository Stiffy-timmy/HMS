import { apiClient } from './client';

export const authApi = {
  login: async (credentials) => {
    const response = await apiClient.post('/auth/login', credentials);
    return response.data;
  },

  signup: async (userData) => {
    const response = await apiClient.post('/auth/signup', userData);
    return response.data;
  },

  forgotPassword: async (email) => {
    const response = await apiClient.post('/auth/forgot-password', { email });
    return response.data;
  },

  resetPassword: async (token, newPassword) => {
    const response = await apiClient.post('/auth/reset-password', {
      token,
      new_password: newPassword,
    });
    return response.data;
  },

  getMe: async () => {
    const response = await apiClient.get('/auth/me');
    return response.data;
  },

  getPasskeys: async () => {
    const response = await apiClient.get('/auth/passkeys');
    return response.data;
  },

  createPasskey: async (data) => {
    const response = await apiClient.post('/auth/passkeys', data);
    return response.data;
  },

  togglePasskey: async (passkeyId) => {
    const response = await apiClient.patch(`/auth/passkeys/${passkeyId}/toggle`);
    return response.data;
  },
};
