import axios from "axios";

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || "",
    headers: {
        "Content-Type": "application/json"
    }
});

api.interceptors.request.use((config) => {
    const token = localStorage.getItem("studyhub_token");

    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
});

api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem("studyhub_token");
            localStorage.removeItem("studyhub_user");

            if (!window.location.pathname.startsWith("/login")) {
                window.location.href = "/login?session=expired";
            }
        }

        return Promise.reject(error);
    }
);

export const getErrorMessage = (error, fallback = "Something went wrong") => {
    const data = error.response?.data;

    if (data?.message) {
        return data.message;
    }

    if (Array.isArray(data?.errors)) {
        return data.errors.map((item) =>
            typeof item === "string" ? item : item.msg
        ).join(", ");
    }

    return fallback;
};

export default api;
