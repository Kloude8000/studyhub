const enrollmentModel = require("../models/enrollmentModel");
const { canManageCourse } = require("../utils/courseAccess");
const sendServerError = require("../utils/sendServerError");


// ================= ENROLL IN COURSE =================
const enrollInCourse = (req, res) => {

    const studentId = req.user.userId;
    const { courseId } = req.params;


    enrollmentModel.checkCourseExists(courseId, (err, courseResults) => {

        if (err) {
            return sendServerError(res, err, "Database error");
        }

        if (courseResults.length === 0) {
            return res.status(404).json({
                message: "Course not found"
            });
        }


        enrollmentModel.checkEnrollment(
            studentId,
            courseId,
            (checkErr, enrollmentResults) => {

                if (checkErr) {
                    return sendServerError(res, checkErr, "Database error");
                }

                if (enrollmentResults.length > 0) {
                    return res.status(400).json({
                        message: "Student already enrolled in this course"
                    });
                }


                enrollmentModel.enrollStudent(
                    studentId,
                    courseId,
                    (enrollErr, result) => {

                        if (enrollErr) {
                            return sendServerError(res, enrollErr, "Enrollment failed");
                        }

                        res.status(201).json({
                            message: "Enrollment successful",
                            enrollment_id: result.insertId
                        });

                    }
                );

            }
        );

    });

};



// ================= GET MY ENROLLMENTS =================
const getMyEnrollments = (req, res) => {

    const studentId = req.user.userId;

    enrollmentModel.getStudentEnrollments(
        studentId,
        (err, results) => {

            if (err) {
                return sendServerError(res, err, "Error fetching enrollments");
            }

            res.json(results);

        }
    );

};



// ================= GET COURSE ENROLLMENTS =================
const getCourseEnrollments = (req, res) => {

    const { courseId } = req.params;
    const { userId, role } = req.user;

    canManageCourse(
        courseId,
        userId,
        role,
        (err, access) => {

            if (err) {
                return sendServerError(res, err, "Error fetching enrollments");
            }

            if (access.notFound) {
                return res.status(404).json({
                    message: "Course not found"
                });
            }

            if (!access.allowed) {
                return res.status(403).json({
                    message: "You do not have permission to view enrollments for this course"
                });
            }

            enrollmentModel.getCourseEnrollments(
                courseId,
                (fetchErr, results) => {

                    if (fetchErr) {
                        return sendServerError(res, fetchErr, "Error fetching enrollments");
                    }

                    res.json(results);

                }
            );

        }
    );

};



// ================= UNENROLL FROM COURSE =================
const unenrollFromCourse = (req, res) => {

    const studentId = req.user.userId;
    const { courseId } = req.params;

    enrollmentModel.checkEnrollment(
        studentId,
        courseId,
        (err, enrollmentResults) => {

            if (err) {
                return sendServerError(res, err, "Database error");
            }

            if (enrollmentResults.length === 0) {
                return res.status(404).json({
                    message: "You are not enrolled in this course"
                });
            }

            enrollmentModel.unenrollStudent(
                studentId,
                courseId,
                (unenrollErr, result) => {

                    if (unenrollErr) {
                        return sendServerError(res, unenrollErr, "Unenrollment failed");
                    }

                    if (result.affectedRows === 0) {
                        return res.status(404).json({
                            message: "Enrollment not found"
                        });
                    }

                    res.json({
                        message: "Successfully unenrolled from course"
                    });

                }
            );

        }
    );

};



module.exports = {
    enrollInCourse,
    getMyEnrollments,
    getCourseEnrollments,
    unenrollFromCourse
};
