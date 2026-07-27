import api from "./client";

export const getCourseAnnouncements = (courseId) =>
    api.get(`/api/announcements/course/${courseId}`);

export const createAnnouncement = (courseId, payload) =>
    api.post(`/api/announcements/course/${courseId}`, payload);

export const deleteAnnouncement = (announcementId) =>
    api.delete(`/api/announcements/${announcementId}`);
