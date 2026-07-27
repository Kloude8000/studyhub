import api from "./client";

export const getUsers = (params = {}) =>
    api.get("/api/reports/users", { params });

export const getUserCategoryCounts = () =>
    api.get("/api/reports/users/counts");

export const exportUsersReport = (format, params = {}) =>
    api.get("/api/reports/users/export", {
        params: { format, ...params },
        responseType: "blob"
    });

export const getStudentReports = (params = {}) =>
    api.get("/api/reports/students", { params });

export const getLecturerReports = () =>
    api.get("/api/reports/lecturers");

export const getStudentReportDetail = (studentId) =>
    api.get(`/api/reports/students/${studentId}`);

export const exportStudentReports = (format, params = {}) =>
    api.get("/api/reports/students/export", {
        params: { format, ...params },
        responseType: "blob"
    });

export const exportLecturerReports = (format) =>
    api.get("/api/reports/lecturers/export", {
        params: { format },
        responseType: "blob"
    });
