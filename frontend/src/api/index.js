import { apiClient } from './client';

export const bedApi = {
  getBeds: async (params = {}) => {
    const response = await apiClient.get('/beds', { params });
    return response.data;
  },

  getBed: async (id) => {
    const response = await apiClient.get(`/beds/${id}`);
    return response.data;
  },

  updateStatus: async (bedId, status) => {
    const response = await apiClient.patch(`/beds/${bedId}/status`, { current_status: status });
    return response.data;
  },
};

export const stayApi = {
  getStays: async (params = {}) => {
    const response = await apiClient.get('/stays', { params });
    return response.data;
  },

  getStay: async (id) => {
    const response = await apiClient.get(`/stays/${id}`);
    return response.data;
  },
};

export const labApi = {
  getLabs: async (params = {}) => {
    const response = await apiClient.get('/labs', { params });
    return response.data;
  },

  updateStatus: async (labId, status) => {
    const response = await apiClient.patch(`/labs/${labId}/status`, { status });
    return response.data;
  },
};

export const conflictApi = {
  getConflicts: async (params = {}) => {
    const response = await apiClient.get('/conflicts', { params });
    return response.data;
  },
};

export const activityApi = {
  getActivities: async (params = {}) => {
    const response = await apiClient.get('/activity', { params });
    return response.data;
  },
};

export const dashboardApi = {
  getAdminStats: async () => {
    const response = await apiClient.get('/dashboard/admin');
    return response.data;
  },

  getHODStats: async (department) => {
    const response = await apiClient.get('/dashboard/hod', { params: { department } });
    return response.data;
  },

  getStaffStats: async (department) => {
    const response = await apiClient.get('/dashboard/staff', { params: { department } });
    return response.data;
  },

  getHospitalUsers: async () => {
    const response = await apiClient.get('/dashboard/users');
    return response.data;
  },

  deleteHospitalUser: async (userId) => {
    const response = await apiClient.delete(`/dashboard/users/${userId}`);
    return response.data;
  },
};
