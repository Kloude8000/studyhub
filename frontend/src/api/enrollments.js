import api from "./client";

export const enrollInCourse = (courseId) =>
    api.post(`/api/enrollments/enroll/${courseId}`);

export const getMyEnrollments = () =>
    api.get("/api/enrollments/my-enrollments");

export const getCourseEnrollments = (courseId) =>
    api.get(`/api/enrollments/course/${courseId}`);
