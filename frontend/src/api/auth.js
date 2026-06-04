import api from "./client";

export const login = (email, password) =>
    api.post("/api/auth/login", { email, password });

export const register = (full_name, email, password) =>
    api.post("/api/auth/register", { full_name, email, password });

export const createLecturer = (payload) =>
    api.post("/api/auth/users/lecturer", payload);
