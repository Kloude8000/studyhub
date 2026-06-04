const enrollmentModel = require("../models/enrollmentModel");
const courseModel = require("../models/courseModel");


const canManageCourse = (courseId, userId, role, callback) => {

    courseModel.getCourseById(courseId, (err, courses) => {

        if (err) {
            return callback(err);
        }

        if (courses.length === 0) {
            return callback(null, { allowed: false, notFound: true });
        }

        if (role === "admin") {
            return callback(null, { allowed: true, notFound: false });
        }

        if (role === "lecturer") {
            return callback(null, {
                allowed: courses[0].lecturer_id === userId,
                notFound: false
            });
        }

        callback(null, { allowed: false, notFound: false });

    });

};


const canViewCourseResources = (courseId, userId, role, callback) => {

    courseModel.getCourseById(courseId, (err, courses) => {

        if (err) {
            return callback(err);
        }

        if (courses.length === 0) {
            return callback(null, { allowed: false, notFound: true });
        }

        if (role === "admin") {
            return callback(null, { allowed: true, notFound: false });
        }

        if (role === "lecturer") {
            const allowed = courses[0].lecturer_id === userId;
            return callback(null, { allowed, notFound: false });
        }

        if (role === "student") {
            return enrollmentModel.checkEnrollment(
                userId,
                courseId,
                (enrollErr, enrollments) => {

                    if (enrollErr) {
                        return callback(enrollErr);
                    }

                    callback(null, {
                        allowed: enrollments.length > 0,
                        notFound: false
                    });

                }
            );
        }

        callback(null, { allowed: false, notFound: false });

    });

};


module.exports = {
    canManageCourse,
    canViewCourseResources
};
