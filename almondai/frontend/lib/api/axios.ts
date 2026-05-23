import axios from "axios";

export const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000",
  headers: {
    "Content-Type": "application/json",
  },
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const responseData = error.response?.data;
    if (responseData && typeof responseData === "object") {
      return Promise.reject({
        ...responseData,
        status: error.response?.status,
      });
    }

    const fallback = {
      error: true,
      message: "Network error",
      code: "NETWORK_ERROR",
      status: error.response?.status,
      details: {},
    };

    return Promise.reject(fallback);
  },
);
