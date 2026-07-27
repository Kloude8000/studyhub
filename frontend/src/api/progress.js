import api from "./client";

export const getMyProgress = () => api.get("/api/progress/my-progress");

export const getCourseProgress = (courseId) =>
    api.get(`/api/progress/course/${courseId}`);

export const getMyLearningLogs = () => api.get("/api/progress/logs");

export const getLearningLogsByCourse = (courseId) =>
    api.get(`/api/progress/logs/course/${courseId}`);

export const addLearningLog = (payload) =>
    api.post("/api/progress/log", payload);

export const updateLearningLog = (logId, payload) =>
    api.put(`/api/progress/log/${logId}`, payload);

export const deleteLearningLog = (logId) =>
    api.delete(`/api/progress/log/${logId}`);

export const exportCourseProgress = (courseId, format) =>
    api.get(`/api/progress/course/${courseId}/export`, {
        params: { format },
        responseType: "blob"
    });
