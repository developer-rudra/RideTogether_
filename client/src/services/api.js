import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // Allow cookies to be sent with cross-origin requests
  headers: {
    'Content-Type': 'application/json',
  },
});

// Response interceptor to format errors cleanly
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const formattedError = {
      message: error.response?.data?.error || error.message || 'An unexpected error occurred',
      status: error.response?.status,
    };
    return Promise.reject(formattedError);
  }
);

export default api;
