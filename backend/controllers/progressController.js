const progressModel = require("../models/progressModel");
const { canManageCourse } = require("../utils/courseAccess");
const sendServerError = require("../utils/sendServerError");


const syncCourseProgress = (
    student_id,
    course_id,
    res,
    successMessage,
    statusCode,
    extra = {}
) => {

    progressModel.getTotalStudyTime(
        student_id,
        course_id,
        (err, totalResults) => {

            if (err) {
                return sendServerError(res, err, "Error calculating progress");
            }

            const totalStudyTime = totalResults[0].total || 0;

            let completionPercentage = (totalStudyTime / 1000) * 100;

            if (completionPercentage > 100) {
                completionPercentage = 100;
            }

            const progressData = {
                student_id,
                course_id,
                total_study_time: totalStudyTime,
                completion_percentage: completionPercentage.toFixed(2)
            };

            progressModel.checkProgressExists(
                student_id,
                course_id,
                (progressErr, progressResults) => {

                    if (progressErr) {
                        return sendServerError(res, progressErr, "Progress error");
                    }

                    const finish = (saveErr) => {

                        if (saveErr) {
                            return sendServerError(
                                res,
                                saveErr,
                                "Failed to update progress"
                            );
                        }

                        res.status(statusCode).json({
                            message: successMessage,
                            progress: progressData,
                            ...extra
                        });

                    };

                    if (progressResults.length > 0) {
                        progressModel.updateProgress(progressData, finish);
                    } else {
                        progressModel.createProgress(progressData, finish);
                    }

                }
            );

        }
    );

};


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
                return sendServerError(res, err, "Database error");
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
                        return sendServerError(res, err, "Failed to create learning log");
                    }


                    syncCourseProgress(
                        student_id,
                        course_id,
                        res,
                        "Learning log added and progress updated",
                        201
                    );

                }
            );

        }
    );

};



// ================= UPDATE LEARNING LOG =================
const updateLearningLog = (req, res) => {

    const student_id = req.user.userId;
    const { logId } = req.params;

    const {
        topic,
        study_duration,
        notes,
        log_date
    } = req.body;


    progressModel.getLearningLogById(logId, (err, results) => {

        if (err) {
            return sendServerError(res, err, "Database error");
        }

        if (results.length === 0) {
            return res.status(404).json({
                message: "Learning log not found"
            });
        }

        const existingLog = results[0];

        if (Number(existingLog.student_id) !== Number(student_id)) {
            return res.status(403).json({
                message: "You do not have permission to edit this learning log"
            });
        }


        progressModel.updateLearningLog(
            logId,
            {
                topic,
                study_duration,
                notes: notes || null,
                log_date
            },
            (updateErr) => {

                if (updateErr) {
                    return sendServerError(res, updateErr, "Failed to update learning log");
                }


                syncCourseProgress(
                    student_id,
                    existingLog.course_id,
                    res,
                    "Learning log updated",
                    200,
                    {
                        log: {
                            log_id: Number(logId),
                            course_id: existingLog.course_id,
                            topic,
                            study_duration,
                            notes: notes || null,
                            log_date
                        }
                    }
                );

            }
        );

    });

};



// ================= GET MY PROGRESS =================
const getMyProgress = (req, res) => {

    const studentId = req.user.userId;

    progressModel.getStudentProgress(
        studentId,
        (err, results) => {

            if (err) {
                return sendServerError(res, err, "Error fetching progress");
            }

            res.json(results);

        }
    );

};



// ================= GET COURSE PROGRESS =================
const getCourseProgress = (req, res) => {

    const { courseId } = req.params;
    const { userId, role } = req.user;


    canManageCourse(
        courseId,
        userId,
        role,
        (err, access) => {

            if (err) {
                return sendServerError(res, err, "Error fetching course progress");
            }

            if (access.notFound) {
                return res.status(404).json({
                    message: "Course not found"
                });
            }

            if (!access.allowed) {
                return res.status(403).json({
                    message: "You do not have permission to view progress for this course"
                });
            }


            progressModel.getCourseProgress(
                courseId,
                (fetchErr, results) => {

                    if (fetchErr) {
                        return sendServerError(res, fetchErr, "Error fetching course progress");
                    }

                    res.json(results);

                }
            );

        }
    );

};



// ================= GET MY LEARNING LOGS (JOURNAL) =================
const getMyLearningLogs = (req, res) => {

    const studentId = req.user.userId;

    progressModel.getStudentLearningLogs(
        studentId,
        (err, results) => {

            if (err) {
                return sendServerError(res, err, "Error fetching learning logs");
            }

            res.json(results);

        }
    );

};



// ================= GET MY LEARNING LOGS BY COURSE =================
const getMyLearningLogsByCourse = (req, res) => {

    const studentId = req.user.userId;
    const { courseId } = req.params;


    progressModel.checkEnrollment(
        studentId,
        courseId,
        (err, enrollmentResults) => {

            if (err) {
                return sendServerError(res, err, "Database error");
            }

            if (enrollmentResults.length === 0) {
                return res.status(403).json({
                    message: "You are not enrolled in this course"
                });
            }


            progressModel.getStudentLearningLogsByCourse(
                studentId,
                courseId,
                (fetchErr, results) => {

                    if (fetchErr) {
                        return sendServerError(res, fetchErr, "Error fetching learning logs");
                    }

                    res.json(results);

                }
            );

        }
    );

};



module.exports = {
    addLearningLog,
    updateLearningLog,
    getMyProgress,
    getMyLearningLogs,
    getMyLearningLogsByCourse,
    getCourseProgress
};