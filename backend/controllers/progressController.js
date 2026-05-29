const progressModel = require("../models/progressModel");



// ================= ADD LEARNING LOG =================
const addLearningLog = (req, res) => {

    const student_id = req.user.userId;

    const {
        course_id,
        topic,
        study_duration,
        notes,
        log_date
    } = req.body;


    // Check enrollment
    progressModel.checkEnrollment(
        student_id,
        course_id,
        (err, enrollmentResults) => {

            if (err) {
                return res.status(500).json({
                    message: "Database error",
                    error: err
                });
            }

            if (enrollmentResults.length === 0) {

                return res.status(403).json({
                    message: "You are not enrolled in this course"
                });

            }


            // Create learning log
            progressModel.createLearningLog(
                {
                    student_id,
                    course_id,
                    topic,
                    study_duration,
                    notes,
                    log_date
                },
                (err, result) => {

                    if (err) {
                        return res.status(500).json({
                            message: "Failed to create learning log",
                            error: err
                        });
                    }


                    // Calculate total study time
                    progressModel.getTotalStudyTime(
                        student_id,
                        course_id,
                        (err, totalResults) => {

                            if (err) {
                                return res.status(500).json({
                                    message: "Error calculating progress",
                                    error: err
                                });
                            }

                            const totalStudyTime =
                                totalResults[0].total || 0;


                            // Example completion logic
                            // 1000 mins = 100%
                            let completionPercentage =
                                (totalStudyTime / 1000) * 100;

                            if (completionPercentage > 100) {
                                completionPercentage = 100;
                            }


                            // Check existing progress
                            progressModel.checkProgressExists(
                                student_id,
                                course_id,
                                (err, progressResults) => {

                                    if (err) {
                                        return res.status(500).json({
                                            message: "Progress error",
                                            error: err
                                        });
                                    }


                                    const progressData = {

                                        student_id,

                                        course_id,

                                        total_study_time:
                                            totalStudyTime,

                                        completion_percentage:
                                            completionPercentage.toFixed(2)

                                    };


                                    // Update or create progress
                                    if (progressResults.length > 0) {

                                        progressModel.updateProgress(
                                            progressData,
                                            (err) => {

                                                if (err) {
                                                    return res.status(500).json({
                                                        message: "Failed to update progress",
                                                        error: err
                                                    });
                                                }

                                                res.status(201).json({
                                                    message: "Learning log added and progress updated",
                                                    progress: progressData
                                                });

                                            }
                                        );

                                    } else {

                                        progressModel.createProgress(
                                            progressData,
                                            (err) => {

                                                if (err) {
                                                    return res.status(500).json({
                                                        message: "Failed to create progress",
                                                        error: err
                                                    });
                                                }

                                                res.status(201).json({
                                                    message: "Learning log added and progress created",
                                                    progress: progressData
                                                });

                                            }
                                        );

                                    }

                                }
                            );

                        }
                    );

                }
            );

        }
    );

};



// ================= GET MY PROGRESS =================
const getMyProgress = (req, res) => {

    const studentId = req.user.userId;

    progressModel.getStudentProgress(
        studentId,
        (err, results) => {

            if (err) {
                return res.status(500).json({
                    message: "Error fetching progress",
                    error: err
                });
            }

            res.json(results);

        }
    );

};



// ================= GET COURSE PROGRESS =================
const getCourseProgress = (req, res) => {

    const { courseId } = req.params;

    progressModel.getCourseProgress(
        courseId,
        (err, results) => {

            if (err) {
                return res.status(500).json({
                    message: "Error fetching course progress",
                    error: err
                });
            }

            res.json(results);

        }
    );

};



module.exports = {
    addLearningLog,
    getMyProgress,
    getCourseProgress
};