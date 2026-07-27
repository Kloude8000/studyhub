import api from "./client";

export const getAdminDashboard = () => api.get("/api/dashboard/admin");

export const getLecturerDashboard = () => api.get("/api/dashboard/lecturer");
