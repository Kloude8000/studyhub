import api from "./client";

export const getProfile = () => api.get("/api/auth/profile");

export const updateProfile = (payload) =>
    api.put("/api/auth/profile", payload);
