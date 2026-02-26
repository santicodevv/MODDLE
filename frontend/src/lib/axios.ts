// Axios client configuration with JWT interceptors
import axios from 'axios';
import type { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { storage, isTokenExpired } from './storage';
import type { ApiError } from '@/types';

// Create axios instance
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 seconds
});

// Flag to prevent multiple refresh attempts
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: Error) => void;
}> = [];

const processQueue = (error: Error | null, token: string | null = null) => {
  failedQueue.forEach((promise) => {
    if (error) {
      promise.reject(error);
    } else if (token) {
      promise.resolve(token);
    }
  });
  failedQueue = [];
};

// Request interceptor - Add JWT token to requests
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = storage.getAccessToken();

    if (token && !config.headers['Authorization']) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - Handle errors and token refresh
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ApiError>) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    // Handle 401 Unauthorized
    if (error.response?.status === 401 && !originalRequest._retry) {
      const token = storage.getAccessToken();

      // If no token or token expired, redirect to login
      if (!token || isTokenExpired(token)) {
        storage.clearAuth();
        window.location.href = '/login';
        return Promise.reject(error);
      }

      // If already refreshing, queue this request
      if (isRefreshing) {
        return new Promise<string>((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((newToken) => {
            originalRequest.headers['Authorization'] = `Bearer ${newToken}`;
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // Try to refresh the token
        const response = await axios.post<{ access_token: string }>(
          `${api.defaults.baseURL}/auth/refresh`,
          {},
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const newToken = response.data.access_token;
        storage.setAccessToken(newToken);
        processQueue(null, newToken);

        originalRequest.headers['Authorization'] = `Bearer ${newToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError as Error, null);
        storage.clearAuth();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    const apiError: ApiError = error.response?.data || {
      statusCode: error.response?.status || 500,
      message: error.message || 'An unexpected error occurred',
    };

    return Promise.reject(apiError);
  }
);

export function getErrorMessage(error: unknown): string {
  if (error && typeof error === 'object' && 'message' in error) {
    const msg = (error as ApiError).message;
    return Array.isArray(msg) ? msg[0] : msg;
  }
  return 'An unexpected error occurred';
}

export default api;
