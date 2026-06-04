import api from "./client";

export const getCourses = () => api.get("/api/courses");

export const getCourse = (id) => api.get(`/api/courses/${id}`);

export const getMyCourses = () => api.get("/api/courses/my-courses");

export const createCourse = (payload) =>
    api.post("/api/courses/create", payload);

export const updateCourse = (id, payload) =>
    api.put(`/api/courses/${id}`, payload);

export const deleteCourse = (id) => api.delete(`/api/courses/${id}`);
