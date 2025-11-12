// API utility functions for backend communication

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://0.0.0.0:4000';

// Get token from localStorage
const getToken = () => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('token');
  }
  return null;
};

// Generic API call function
async function apiCall(endpoint: string, options: RequestInit = {}) {
  const token = getToken();
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  // Merge with any additional headers from options
  if (options.headers) {
    Object.assign(headers, options.headers);
  }
  
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });
  
  if (response.status === 401) {
    // Token expired or invalid, clear storage and redirect to login
    // Only redirect if not already on login page to avoid redirect loops
    if (typeof window !== 'undefined') {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      // Only redirect if not already on login page
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    throw new Error('Unauthorized');
  }
  
  const data = await response.json();
  
  if (!response.ok) {
    // Include message field if available (for more detailed error messages)
    const errorMessage = data.message || data.error || 'API request failed';
    const error = new Error(errorMessage);
    // Attach full response data for detailed error handling
    (error as any).response = { data, status: response.status };
    throw error;
  }
  
  return data;
}

// Auth APIs
export const authAPI = {
  login: async (username: string, password: string) => {
    // Login endpoint needs special handling - don't redirect on 401 (invalid credentials)
    const token = getToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ username, password }),
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Login failed');
    }
    
    return data;
  },
  
  getMe: async () => {
    return apiCall('/api/auth/me');
  },
};

// Rooms APIs
export const roomsAPI = {
  getAllRooms: async () => {
    return apiCall('/api/rooms');
  },
  
  getRoomDetails: async (roomId: string) => {
    return apiCall(`/api/rooms/${roomId}`);
  },
  
  updateRoomStatus: async (roomId: string, status: string) => {
    return apiCall(`/api/rooms/${roomId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  },
  
  assignRoomWithProducts: async (customerCardId: string, productIds: string[]) => {
    return apiCall('/api/rooms/assign', {
      method: 'POST',
      body: JSON.stringify({ customerCardId, productIds }),
    });
  },
  
  assignCustomerToRoom: async (roomId: string, customerRfid: string) => {
    return apiCall(`/api/rooms/${roomId}/assign-customer`, {
      method: 'POST',
      body: JSON.stringify({ customerRfid }),
    });
  },
  
  scanProductIn: async (roomId: string, productSku: string) => {
    return apiCall(`/api/rooms/${roomId}/scan-in`, {
      method: 'POST',
      body: JSON.stringify({ productSku }),
    });
  },
  
  scanProductOut: async (roomId: string, productSku: string, customerCardId?: string) => {
    return apiCall(`/api/rooms/${roomId}/scan-out`, {
      method: 'POST',
      body: JSON.stringify({ productSku, ...(customerCardId && { customerCardId }) }),
    });
  },
  
  getPendingScanOutItems: async (customerCardId?: string, roomId?: string) => {
    const params = new URLSearchParams();
    if (customerCardId) params.append('customerCardId', customerCardId);
    if (roomId) params.append('roomId', roomId);
    return apiCall(`/api/rooms/pending-scan-out?${params.toString()}`);
  },
  
  addProductToRoom: async (roomId: string, productSku: string) => {
    return apiCall(`/api/rooms/${roomId}/add-product`, {
      method: 'POST',
      body: JSON.stringify({ productSku }),
    });
  },
  
  searchProducts: async (query?: string, limit?: number) => {
    const params = new URLSearchParams();
    if (query) params.append('q', query);
    if (limit) params.append('limit', limit.toString());
    return apiCall(`/api/rooms/products/search?${params.toString()}`);
  },
};

// Alerts APIs
export const alertsAPI = {
  getAllAlerts: async () => {
    return apiCall('/api/alerts');
  },
  
  createAlert: async (alertData: {
    roomId: string;
    type: string;
    severity: string;
    message: string;
  }) => {
    return apiCall('/api/alerts', {
      method: 'POST',
      body: JSON.stringify(alertData),
    });
  },
  
  resolveAlert: async (alertId: string) => {
    return apiCall(`/api/alerts/${alertId}/resolve`, {
      method: 'PATCH',
    });
  },
};

// Unlock Requests APIs
export const unlockRequestsAPI = {
  getUnlockRequests: async () => {
    return apiCall('/api/unlock-requests');
  },
  
  createUnlockRequest: async (roomId: string, reason: string) => {
    return apiCall('/api/unlock-requests', {
      method: 'POST',
      body: JSON.stringify({ roomId, reason }),
    });
  },
  
  directUnlockRoom: async (roomId: string) => {
    return apiCall('/api/unlock-requests/direct', {
      method: 'POST',
      body: JSON.stringify({ roomId }),
    });
  },
  
  approveUnlockRequest: async (requestId: string) => {
    return apiCall(`/api/unlock-requests/${requestId}/approve`, {
      method: 'PATCH',
    });
  },
  
  rejectUnlockRequest: async (requestId: string) => {
    return apiCall(`/api/unlock-requests/${requestId}/reject`, {
      method: 'PATCH',
    });
  },
};

// AI APIs
export const aiAPI = {
  health: async () => {
    return apiCall('/api/ai/health');
  },
  assignRoom: async (itemIds: string[]) => {
    return apiCall('/api/ai/assign-room', {
      method: 'POST',
      body: JSON.stringify({ item_ids: itemIds }),
    });
  },
  roomsStatus: async () => {
    return apiCall('/api/ai/rooms/status');
  },
  predictDuration: async (itemIds: string[], entryTime?: string) => {
    return apiCall('/api/ai/predict-duration', {
      method: 'POST',
      body: JSON.stringify({ item_ids: itemIds, entry_time: entryTime }),
    });
  },
  detectAnomaly: async (payload: {
    session_id: string;
    room_id: string;
    actual_duration: number;
    predicted_duration: number;
    entry_scans: string[];
    exit_scans: string[];
    entry_time: string;
  }) => {
    return apiCall('/api/ai/detect-anomaly', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
};

export default {
  auth: authAPI,
  rooms: roomsAPI,
  alerts: alertsAPI,
  unlockRequests: unlockRequestsAPI,
  ai: aiAPI,
};
