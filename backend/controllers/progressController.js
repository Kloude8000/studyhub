const progressModel = require("../models/progressModel");
const courseModel = require("../models/courseModel");
const { canManageCourse } = require("../utils/courseAccess");
const sendServerError = require("../utils/sendServerError");
const { calculateCompletionPercentage } = require("../utils/progressCalc");
const { sendCsv, sendPdfTable } = require("../utils/exportHelpers");

const INACTIVE_DAYS = 14;
const AT_RISK_COMPLETION = 25;

const isAtRisk = (item) => {
    const completion = Number(item.completion_percentage || 0);

    if (completion < AT_RISK_COMPLETION) {
        return true;
    }

    if (!item.last_log_date) {
        return true;
    }

    const lastLog = new Date(item.last_log_date);
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - INACTIVE_DAYS);

    return lastLog < cutoff;
};

const annotateProgressRows = (rows) =>
    rows.map((row) => ({
        ...row,
        at_risk: isAtRisk(row)
    }));

const syncCourseProgress = (
    student_id,
    course_id,
    res,
    successMessage,
    statusCode,
    extra = {}
) => {

    courseModel.getCourseTargetMinutes(course_id, (targetErr, targetResults) => {

        if (targetErr) {
            return sendServerError(res, targetErr, "Error fetching course target");
        }

        const targetMinutes = targetResults[0]?.completion_target_minutes ?? 1000;

        progressModel.getTotalStudyTime(
            student_id,
            course_id,
            (err, totalResults) => {

                if (err) {
                    return sendServerError(res, err, "Error calculating progress");
                }

                const totalStudyTime = totalResults[0].total || 0;
                const completionPercentage = calculateCompletionPercentage(
                    totalStudyTime,
                    targetMinutes
                );

                const progressData = {
                    student_id,
                    course_id,
                    total_study_time: totalStudyTime,
                    completion_percentage: completionPercentage
                };

                const finishProgress = (saveErr) => {

                    if (saveErr) {
                        return sendServerError(
                            res,
                            saveErr,
                            "Failed to update progress"
                        );
                    }

                    if (totalStudyTime === 0) {
                        return progressModel.deleteProgress(
                            student_id,
                            course_id,
                            (deleteErr) => {

                                if (deleteErr) {
                                    return sendServerError(
                                        res,
                                        deleteErr,
                                        "Failed to clear progress"
                                    );
                                }

                                res.status(statusCode).json({
                                    message: successMessage,
                                    progress: null,
                                    ...extra
                                });

                            }
                        );
                    }

                    res.status(statusCode).json({
                        message: successMessage,
                        progress: progressData,
                        ...extra
                    });

                };

                progressModel.checkProgressExists(
                    student_id,
                    course_id,
                    (progressErr, progressResults) => {

                        if (progressErr) {
                            return sendServerError(res, progressErr, "Progress error");
                        }

                        if (progressResults.length > 0) {
                            progressModel.updateProgress(progressData, finishProgress);
                        } else {
                            progressModel.createProgress(progressData, finishProgress);
                        }

                    }
                );

            }
        );

    });

};


const addLearningLog = (req, res) => {

    const student_id = req.user.userId;

    const {
        course_id,
        topic,
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

            progressModel.createLearningLog(
                {
                    student_id,
                    course_id,
                    topic,
                    study_duration,
                    notes,
                    log_date
                },
                (createErr) => {

                    if (createErr) {
                        return sendServerError(res, createErr, "Failed to create learning log");
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

            syncCourseProgress(
                student_id,
                existingLog.course_id,
                res,
                "Learning log deleted",
                200
            );

        });

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

                    res.json(annotateProgressRows(results));

                }
            );

        }
    );

};


const exportCourseProgress = (req, res) => {

    const { courseId } = req.params;
    const { userId, role } = req.user;
    const format = (req.query.format || "csv").toLowerCase();

    canManageCourse(
        courseId,
        userId,
        role,
        (err, access) => {

            if (err) {
                return sendServerError(res, err, "Error exporting course progress");
            }

            if (access.notFound) {
                return res.status(404).json({
                    message: "Course not found"
                });
            }

            if (!access.allowed) {
                return res.status(403).json({
                    message: "You do not have permission to export progress for this course"
                });
            }

            courseModel.getCourseById(courseId, (courseErr, courseResults) => {

                if (courseErr) {
                    return sendServerError(res, courseErr, "Error fetching course");
                }

                const course = courseResults[0];

                progressModel.getCourseProgress(
                    courseId,
                    (fetchErr, results) => {

                        if (fetchErr) {
                            return sendServerError(res, fetchErr, "Error fetching course progress");
                        }

                        const rows = annotateProgressRows(results).map((item) => [
                            item.student_name,
                            item.student_email || "",
                            item.total_study_time,
                            item.completion_percentage,
                            item.last_log_date || "None",
                            item.at_risk ? "Yes" : "No"
                        ]);

                        const headers = [
                            "Student",
                            "Email",
                            "Study Minutes",
                            "Completion %",
                            "Last Log Date",
                            "At Risk"
                        ];

                        const filename = `${course.course_code}-progress.${format}`;

                        if (format === "pdf") {
                            return sendPdfTable(
                                res,
                                filename,
                                `${course.course_title} — Student Progress`,
                                headers,
                                rows
                            );
                        }

                        if (format === "csv") {
                            return sendCsv(res, filename, headers, rows);
                        }

                        res.status(400).json({
                            message: "Format must be csv or pdf"
                        });

                    }
                );

            });

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


module.exports = {
    addLearningLog,
    updateLearningLog,
    deleteLearningLog,
    getMyProgress,
    getMyLearningLogs,
    getMyLearningLogsByCourse,
    getCourseProgress,
    exportCourseProgress,
    INACTIVE_DAYS,
    AT_RISK_COMPLETION
};
