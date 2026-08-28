// frontend/src/lib/api.js
const rawUrl = import.meta.env.VITE_API_URL;

// If deployed on Vercel and VITE_API_URL is missing, log a clear warning in the browser console
if (!rawUrl && typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
  console.error(
    "⚠️ [CRITICAL CONFIG]: VITE_API_URL is not defined in environment variables!\n" +
    "The frontend is falling back to localhost:8000. Please set VITE_API_URL=https://<your-backend>.onrender.com/api in Vercel project settings and redeploy."
  );
}

// Normalize: strip any trailing slash and ensure /api path exists cleanly
const normalizeApiUrl = (url) => {
  if (!url || !url.trim()) {
    return 'http://localhost:8000/api';
  }
  let clean = url.trim().replace(/\/+$/, '');
  if (!clean.endsWith('/api')) {
    clean = `${clean}/api`;
  }
  return clean;
};

export const API_BASE_URL = normalizeApiUrl(rawUrl);

export async function apiRequest(endpoint, options = {}) {
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const url = `${API_BASE_URL}${cleanEndpoint}`;
  
  const token = localStorage.getItem('hms_token') || localStorage.getItem('access_token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const response = await fetch(url, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const errorMsg = data?.detail || data?.message || `HTTP Error ${response.status}`;
    throw new Error(errorMsg);
  }

  return data;
}
