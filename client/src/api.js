import axios from "axios";

// Create Axios instance
const api = axios.create({
  baseURL: "http://35.154.47.168:5002"
});

// Request interceptor to add token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers = {
        ...config.headers,
        Authorization: `Bearer ${token}`,
      };
    }
    return config;
  },
  (error) => {
    // Handle request error
    return Promise.reject(error);
  }
);

// Optional: Response interceptor to handle errors globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Handle unauthorized access, e.g., redirect to login
      console.log("Unauthorized! Redirecting to login...");
      // window.location.href = "/login"; // uncomment if needed
    }
    return Promise.reject(error);
  }
);

export default api;