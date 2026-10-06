const progressModel = require("../models/progressModel");
const topicModel = require("../models/topicModel");
const { canManageCourse } = require("../utils/courseAccess");
const {
    syncStudentCourseProgress,
    respondWithProgress
} = require("../utils/syncProgress");
const sendServerError = require("../utils/sendServerError");


const addLearningLog = (req, res) => {

    const student_id = req.user.userId;

    const {
        course_id,
        topic_id,
        study_duration,
        notes,
        log_date
    } = req.body;


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


            topicModel.getTopicById(topic_id, (topicErr, topics) => {

                if (topicErr) {
                    return sendServerError(res, topicErr, "Database error");
                }

                if (topics.length === 0 || Number(topics[0].course_id) !== Number(course_id)) {
                    return res.status(400).json({
                        message: "Topic does not belong to this course"
                    });
                }


                progressModel.createLearningLog(
                    {
                        student_id,
                        course_id,
                        topic_id,
                        study_duration,
                        notes: notes || null,
                        log_date
                    },
                    (logErr, result) => {

                        if (logErr) {
                            if (logErr.code === "ER_DUP_ENTRY") {
                                return res.status(400).json({
                                    message: "You have already logged this topic. Edit the existing log instead."
                                });
                            }

                            return sendServerError(res, logErr, "Failed to create learning log");
                        }


                        syncStudentCourseProgress(
                            student_id,
                            course_id,
                            true,
                            (syncErr, progressData) => {
                                respondWithProgress(
                                    res,
                                    201,
                                    "Learning log added and progress updated",
                                    {
                                        log: {
                                            log_id: result.insertId,
                                            course_id,
                                            topic_id,
                                            topic: topics[0].title,
                                            study_duration,
                                            notes: notes || null,
                                            log_date
                                        }
                                    },
                                    syncErr,
                                    progressData
                                );
                            }
                        );

                    }
                );

            });

        }
    );

};


const updateLearningLog = (req, res) => {

    const student_id = req.user.userId;
    const { logId } = req.params;

    const {
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
                study_duration,
                notes: notes || null,
                log_date
            },
            (updateErr) => {

                if (updateErr) {
                    return sendServerError(res, updateErr, "Failed to update learning log");
                }


                syncStudentCourseProgress(
                    student_id,
                    existingLog.course_id,
                    true,
                    (syncErr, progressData) => {
                        respondWithProgress(
                            res,
                            200,
                            "Learning log updated",
                            {
                                log: {
                                    log_id: Number(logId),
                                    course_id: existingLog.course_id,
                                    topic_id: existingLog.topic_id,
                                    topic: existingLog.topic,
                                    study_duration,
                                    notes: notes || null,
                                    log_date
                                }
                            },
                            syncErr,
                            progressData
                        );
                    }
                );

            }
        );

    });

};


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

                    res.json(results.map((row) => ({
                        ...row,
                        status: row.completed_at ? "Completed" : "In progress"
                    })));

                }
            );

        }
    );

};


const getStudentCourseChecklist = (req, res) => {

    const { courseId, studentId } = req.params;
    const { userId, role } = req.user;


    canManageCourse(
        courseId,
        userId,
        role,
        (err, access) => {

            if (err) {
                return sendServerError(res, err, "Error fetching topic checklist");
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


            progressModel.checkEnrollment(
                studentId,
                courseId,
                (enrollErr, enrollments) => {

                    if (enrollErr) {
                        return sendServerError(res, enrollErr, "Database error");
                    }

                    if (enrollments.length === 0) {
                        return res.status(404).json({
                            message: "Student is not enrolled in this course"
                        });
                    }


                    progressModel.getStudentTopicChecklist(
                        studentId,
                        courseId,
                        (listErr, results) => {

                            if (listErr) {
                                return sendServerError(res, listErr, "Error fetching topic checklist");
                            }

                            res.json(results);

                        }
                    );

                }
            );

        }
    );

};


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


const deleteLearningLog = (req, res) => {

    const student_id = req.user.userId;
    const { logId } = req.params;


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
                message: "You do not have permission to delete this learning log"
            });
        }


        progressModel.deleteLearningLog(logId, (deleteErr) => {

            if (deleteErr) {
                return sendServerError(res, deleteErr, "Failed to delete learning log");
            }


            syncStudentCourseProgress(
                student_id,
                existingLog.course_id,
                true,
                (syncErr, progressData) => {
                    respondWithProgress(
                        res,
                        200,
                        "Learning log deleted",
                        {},
                        syncErr,
                        progressData
                    );
                }
            );

        });

    });

};


module.exports = {
    addLearningLog,
    updateLearningLog,
    deleteLearningLog,
    getMyProgress,
    getMyLearningLogs,
    getMyLearningLogsByCourse,
    getCourseProgress,
    getStudentCourseChecklist
};
