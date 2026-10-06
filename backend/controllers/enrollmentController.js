const enrollmentModel = require("../models/enrollmentModel");
const progressModel = require("../models/progressModel");
const userModel = require("../models/userModel");
const { canManageCourse } = require("../utils/courseAccess");
const { ensureProgressRow } = require("../utils/syncProgress");
const { notifyEnrollment } = require("../utils/notify");
const sendServerError = require("../utils/sendServerError");


const finishEnrollment = (studentId, course, res) => {

    enrollmentModel.enrollStudent(
        studentId,
        course.course_id,
        (enrollErr, result) => {

            if (enrollErr) {
                return sendServerError(res, enrollErr, "Enrollment failed");
            }

            ensureProgressRow(studentId, course.course_id, (progressErr) => {

                if (progressErr) {
                    return sendServerError(res, progressErr, "Enrollment saved but progress setup failed");
                }

                res.status(201).json({
                    message: "Enrollment successful",
                    enrollment_id: result.insertId
                });

                notifyEnrollment(studentId, course);

            });

        }
    );

};


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

                finishEnrollment(studentId, courseResults[0], res);

            }
        );

    });

};



const removeStudentFromCourse = (studentId, courseId, res) => {

    enrollmentModel.checkEnrollment(
        studentId,
        courseId,
        (checkErr, enrollmentResults) => {

            if (checkErr) {
                return sendServerError(res, checkErr, "Database error");
            }

            if (enrollmentResults.length === 0) {
                return res.status(404).json({
                    message: "Not enrolled in this course"
                });
            }

            progressModel.deleteStudentCourseLearningLogs(
                studentId,
                courseId,
                (logsErr) => {

                    if (logsErr) {
                        return sendServerError(res, logsErr, "Error removing learning logs");
                    }

                    progressModel.deleteStudentCourseResourceAccess(
                        studentId,
                        courseId,
                        (accessErr) => {

                            if (accessErr) {
                                return sendServerError(res, accessErr, "Error removing resource access");
                            }

                            progressModel.deleteStudentCourseProgress(
                                studentId,
                                courseId,
                                (progressErr) => {

                                    if (progressErr) {
                                        return sendServerError(res, progressErr, "Error removing progress");
                                    }

                                    enrollmentModel.deleteEnrollment(
                                        studentId,
                                        courseId,
                                        (deleteErr, result) => {

                                            if (deleteErr) {
                                                return sendServerError(res, deleteErr, "Unenrollment failed");
                                            }

                                            if (result.affectedRows === 0) {
                                                return res.status(404).json({
                                                    message: "Not enrolled in this course"
                                                });
                                            }

                                            res.json({
                                                message: "Unenrolled successfully"
                                            });

                                        }
                                    );

                                }
                            );

                        }
                    );

                }
            );

        }
    );

};


// ================= UNENROLL FROM COURSE =================
const unenrollFromCourse = (req, res) => {

    removeStudentFromCourse(req.user.userId, req.params.courseId, res);

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


const getAvailableStudents = (req, res) => {

    const { courseId } = req.params;
    const { userId, role } = req.user;

    canManageCourse(
        courseId,
        userId,
        role,
        (err, access) => {

            if (err) {
                return sendServerError(res, err, "Error fetching students");
            }

            if (access.notFound) {
                return res.status(404).json({
                    message: "Course not found"
                });
            }

            if (!access.allowed) {
                return res.status(403).json({
                    message: "You do not have permission to view students for this course"
                });
            }

            enrollmentModel.getStudentsNotInCourse(courseId, (fetchErr, results) => {

                if (fetchErr) {
                    return sendServerError(res, fetchErr, "Error fetching students");
                }

                res.json(results);

            });

        }
    );

};


const enrollStudentByStaff = (req, res) => {

    const { courseId } = req.params;
    const { userId, role } = req.user;
    const studentId = Number(req.body.student_id);

    if (!studentId) {
        return res.status(400).json({
            message: "Student ID is required"
        });
    }

    canManageCourse(
        courseId,
        userId,
        role,
        (err, access) => {

            if (err) {
                return sendServerError(res, err, "Error enrolling student");
            }

            if (access.notFound) {
                return res.status(404).json({
                    message: "Course not found"
                });
            }

            if (!access.allowed) {
                return res.status(403).json({
                    message: "You do not have permission to enrol students in this course"
                });
            }

            userModel.findUserById(studentId, (userErr, users) => {

                if (userErr) {
                    return sendServerError(res, userErr, "Error enrolling student");
                }

                if (users.length === 0 || users[0].role !== "student") {
                    return res.status(400).json({
                        message: "Student account not found"
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

                        enrollmentModel.checkCourseExists(courseId, (courseErr, courseResults) => {

                            if (courseErr || !courseResults[0]) {
                                return sendServerError(res, courseErr, "Error enrolling student");
                            }

                            finishEnrollment(studentId, courseResults[0], res);

                        });

                    }
                );

            });

        }
    );

};


const unenrollStudentByStaff = (req, res) => {

    const { courseId, studentId } = req.params;
    const { userId, role } = req.user;
    const targetStudentId = Number(studentId);

    if (!targetStudentId) {
        return res.status(400).json({
            message: "Student ID is required"
        });
    }

    canManageCourse(
        courseId,
        userId,
        role,
        (err, access) => {

            if (err) {
                return sendServerError(res, err, "Error removing student");
            }

            if (access.notFound) {
                return res.status(404).json({
                    message: "Course not found"
                });
            }

            if (!access.allowed) {
                return res.status(403).json({
                    message: "You do not have permission to remove students from this course"
                });
            }

            removeStudentFromCourse(targetStudentId, courseId, res);

        }
    );

};


module.exports = {
    enrollInCourse,
    unenrollFromCourse,
    getMyEnrollments,
    getCourseEnrollments,
    getAvailableStudents,
    enrollStudentByStaff,
    unenrollStudentByStaff
};
