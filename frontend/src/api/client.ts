import axios, { AxiosError } from "axios";

const API_BASE_URL = import.meta.env.VITE_API_URL || "/api";

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Interceptor to inject JWT Bearer Token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("finflow_token");
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Interceptor to handle 401 Unauthorized globally
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("finflow_token");
      // Dispatch custom event so auth store and UI can react without hard reload
      window.dispatchEvent(new CustomEvent("finflow:unauthorized"));
    }
    return Promise.reject(error);
  }
);
