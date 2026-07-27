const courseModel = require("../models/courseModel");
const enrollmentModel = require("../models/enrollmentModel");
const progressModel = require("../models/progressModel");
const userModel = require("../models/userModel");
const sendServerError = require("../utils/sendServerError");
const { INACTIVE_DAYS, AT_RISK_COMPLETION } = require("./progressController");


const getAdminDashboard = (req, res) => {

    courseModel.getAllCourses((courseErr, courses) => {

        if (courseErr) {
            return sendServerError(res, courseErr, "Error fetching dashboard");
        }

        userModel.getUsers(null, (userErr, users) => {

            if (userErr) {
                return sendServerError(res, userErr, "Error fetching dashboard");
            }

            const students = users.filter((user) => user.role === "student");
            const lecturers = users.filter((user) => user.role === "lecturer");

            res.json({
                course_count: courses.length,
                student_count: students.length,
                lecturer_count: lecturers.length
            });

        });

    });

};


const getLecturerDashboard = (req, res) => {

    const lecturerId = req.user.userId;

    courseModel.getLecturerDashboardStats(lecturerId, (statsErr, statsResults) => {

        if (statsErr) {
            return sendServerError(res, statsErr, "Error fetching dashboard");
        }

        courseModel.getCoursesByLecturer(lecturerId, (courseErr, courses) => {

            if (courseErr) {
                return sendServerError(res, courseErr, "Error fetching dashboard");
            }

            if (courses.length === 0) {
                return res.json({
                    ...statsResults[0],
                    at_risk_count: 0,
                    recent_enrollments: []
                });
            }

            const courseIds = courses.map((course) => course.course_id);
            let pending = courseIds.length;
            let atRiskCount = 0;
            const recentEnrollments = [];

            courseIds.forEach((courseId) => {

                progressModel.getCourseProgress(courseId, (progressErr, progressRows) => {

                    if (!progressErr) {
                        progressRows.forEach((row) => {
                            const completion = Number(row.completion_percentage || 0);
                            let atRisk = completion < AT_RISK_COMPLETION || !row.last_log_date;

                            if (!atRisk && row.last_log_date) {
                                const cutoff = new Date();
                                cutoff.setDate(cutoff.getDate() - INACTIVE_DAYS);
                                atRisk = new Date(row.last_log_date) < cutoff;
                            }

                            if (atRisk) {
                                atRiskCount += 1;
                            }
                        });
                    }

                    enrollmentModel.getCourseEnrollments(
                        courseId,
                        (enrollmentErr, enrollments) => {

                            if (!enrollmentErr) {
                                enrollments.slice(0, 3).forEach((enrollment) => {
                                    recentEnrollments.push({
                                        ...enrollment,
                                        course_id: courseId,
                                        course_title: courses.find(
                                            (course) => course.course_id === courseId
                                        )?.course_title
                                    });
                                });
                            }

                            pending -= 1;

                            if (pending === 0) {
                                recentEnrollments.sort(
                                    (a, b) => new Date(b.enrolled_at) - new Date(a.enrolled_at)
                                );

                                res.json({
                                    ...statsResults[0],
                                    at_risk_count: atRiskCount,
                                    recent_enrollments: recentEnrollments.slice(0, 5)
                                });
                            }

                        }
                    );

                });

            });

        });

    });

};


module.exports = {
    getAdminDashboard,
    getLecturerDashboard
};
