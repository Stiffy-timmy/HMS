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

  markClean: async (bedId) => {
    const response = await apiClient.post(`/beds/${bedId}/mark-clean`);
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

  quickAdmit: async (payload) => {
    const response = await apiClient.post('/stays/quick-admit', payload);
    return response.data;
  },

  dischargePatient: async (stayId) => {
    const response = await apiClient.post(`/stays/${stayId}/discharge`);
    return response.data;
  },
};

export const billingApi = {
  getBillings: async (params = {}) => {
    const response = await apiClient.get('/billing', { params });
    return response.data;
  },

  updateStatus: async (billingId, status) => {
    const response = await apiClient.patch(`/billing/${billingId}/status`, { status });
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

  markBilled: async (labId) => {
    const response = await apiClient.post(`/labs/${labId}/bill`);
    return response.data;
  },
};


export const conflictApi = {
  getConflicts: async (params = {}) => {
    const response = await apiClient.get('/conflicts', { params });
    return response.data;
  },

  getConflict: async (id) => {
    const response = await apiClient.get(`/conflicts/${id}`);
    return response.data;
  },

  resolveConflict: async (conflictId, payload = {}) => {
    const response = await apiClient.post(`/conflicts/${conflictId}/resolve`, payload);
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

export const requisitionApi = {
  getRequisitions: async (params = {}) => {
    const response = await apiClient.get('/requisitions', { params });
    return response.data;
  },

  createRequisition: async (payload) => {
    const response = await apiClient.post('/requisitions', payload);
    return response.data;
  },

  updateStatus: async (reqId, payload) => {
    const response = await apiClient.patch(`/requisitions/${reqId}/status`, payload);
    return response.data;
  },
};

export const equipmentApi = {
  getEquipments: async (params = {}) => {
    const response = await apiClient.get('/equipments', { params });
    return response.data;
  },

  createEquipment: async (payload) => {
    const response = await apiClient.post('/equipments', payload);
    return response.data;
  },

  updateStatus: async (eqId, payload) => {
    const response = await apiClient.patch(`/equipments/${eqId}/status`, payload);
    return response.data;
  },
};

export const hospitalApi = {
  getHospitals: async () => {
    const response = await apiClient.get('/hospitals');
    return response.data;
  },

  getHospital: async (id) => {
    const response = await apiClient.get(`/hospitals/${id}`);
    return response.data;
  },
};

export const doctorApi = {
  getDoctors: async (params = {}) => {
    const response = await apiClient.get('/doctors', { params });
    return response.data;
  },

  getAssignments: async (params = {}) => {
    const response = await apiClient.get('/doctors/assignments', { params });
    return response.data;
  },

  updateDutyStatus: async (assignmentId, payload) => {
    const response = await apiClient.patch(`/doctors/assignments/${assignmentId}/duty-status`, payload);
    return response.data;
  },
};

export const appointmentApi = {
  getRecommendations: async (payload) => {
    const response = await apiClient.post('/appointments/recommend', payload);
    return response.data;
  },

  bookAppointment: async (payload) => {
    const response = await apiClient.post('/appointments/book', payload);
    return response.data;
  },

  getAppointments: async (params = {}) => {
    const response = await apiClient.get('/appointments', { params });
    return response.data;
  },
};


