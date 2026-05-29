const enrollmentModel = require("../models/enrollmentModel");



// ================= ENROLL IN COURSE =================
const enrollInCourse = (req, res) => {

    const studentId = req.user.userId;

    const { courseId } = req.params;


    // Check course exists
    enrollmentModel.checkCourseExists(courseId, (err, courseResults) => {

        if (err) {
            return res.status(500).json({
                message: "Database error",
                error: err
            });
        }

        if (courseResults.length === 0) {
            return res.status(404).json({
                message: "Course not found"
            });
        }


        // Check duplicate enrollment
        enrollmentModel.checkEnrollment(
            studentId,
            courseId,
            (err, enrollmentResults) => {

                if (err) {
                    return res.status(500).json({
                        message: "Database error",
                        error: err
                    });
                }

                if (enrollmentResults.length > 0) {
                    return res.status(400).json({
                        message: "Student already enrolled in this course"
                    });
                }


                // Enroll student
                enrollmentModel.enrollStudent(
                    studentId,
                    courseId,
                    (err, result) => {

                        if (err) {
                            return res.status(500).json({
                                message: "Enrollment failed",
                                error: err
                            });
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
                return res.status(500).json({
                    message: "Error fetching enrollments",
                    error: err
                });
            }

            res.json(results);

        }
    );

};



// ================= GET COURSE ENROLLMENTS =================
const getCourseEnrollments = (req, res) => {

    const { courseId } = req.params;

    enrollmentModel.getCourseEnrollments(
        courseId,
        (err, results) => {

            if (err) {
                return res.status(500).json({
                    message: "Error fetching enrollments",
                    error: err
                });
            }

            res.json(results);

        }
    );

};



module.exports = {
    enrollInCourse,
    getMyEnrollments,
    getCourseEnrollments
};