const progressModel = require("../models/progressModel");
const topicModel = require("../models/topicModel");
const { notifyCourseCompleted } = require("./notify");
const sendServerError = require("./sendServerError");


const completionFromCounts = (logged, total) => {

    if (!total || total <= 0) {
        return 0;
    }

    const percent = (logged / total) * 100;

    return Math.min(100, percent);

};


const saveProgressRow = (studentId, courseId, totals, touchActivity, callback) => {

    const completionPercentage = completionFromCounts(
        totals.logged,
        totals.topicTotal
    );
    const isComplete = totals.topicTotal > 0 && totals.logged >= totals.topicTotal;
    const lastActivity = touchActivity ? new Date() : null;

    const progressData = {
        student_id: studentId,
        course_id: courseId,
        total_study_time: totals.studyTime,
        completion_percentage: completionPercentage.toFixed(2),
        completed_at: null,
        last_activity_at: lastActivity
    };

    progressModel.checkProgressExists(studentId, courseId, (err, rows) => {

        if (err) {
            return callback(err);
        }

        const existing = rows[0];
        const justCompleted = isComplete && !(existing && existing.completed_at);

        if (isComplete) {
            progressData.completed_at = existing && existing.completed_at
                ? existing.completed_at
                : new Date();
        }

        const afterSave = (saveErr) => {
            if (!saveErr && justCompleted) {
                notifyCourseCompleted(studentId, courseId);
            }
            callback(saveErr, progressData);
        };

        if (rows.length > 0) {
            return progressModel.updateProgress(progressData, afterSave);
        }

        progressModel.createProgress(progressData, afterSave);

    });

};


const loadTotals = (studentId, courseId, callback) => {

    topicModel.countCourseTopics(courseId, (topicErr, topicRows) => {

        if (topicErr) {
            return callback(topicErr);
        }

        progressModel.countStudentTopicLogs(studentId, courseId, (logErr, logRows) => {

            if (logErr) {
                return callback(logErr);
            }

            progressModel.getTotalStudyTime(studentId, courseId, (timeErr, timeRows) => {

                if (timeErr) {
                    return callback(timeErr);
                }

                callback(null, {
                    topicTotal: Number(topicRows[0].total) || 0,
                    logged: Number(logRows[0].total) || 0,
                    studyTime: Number(timeRows[0].total) || 0
                });

            });

        });

    });

};


const syncStudentCourseProgress = (studentId, courseId, touchActivity, callback) => {

    loadTotals(studentId, courseId, (err, totals) => {

        if (err) {
            return callback(err);
        }

        saveProgressRow(studentId, courseId, totals, touchActivity, callback);

    });

};


const ensureProgressRow = (studentId, courseId, callback) => {

    progressModel.checkProgressExists(studentId, courseId, (err, rows) => {

        if (err) {
            return callback(err);
        }

        if (rows.length > 0) {
            return callback(null);
        }

        progressModel.createProgress({
            student_id: studentId,
            course_id: courseId,
            total_study_time: 0,
            completion_percentage: 0,
            completed_at: null,
            last_activity_at: null
        }, callback);

    });

};


const recalculateCourseProgress = (courseId, callback) => {

    progressModel.getEnrolledStudentIds(courseId, (err, students) => {

        if (err) {
            return callback(err);
        }

        if (students.length === 0) {
            return callback(null);
        }

        let remaining = students.length;
        let firstError = null;

        students.forEach((row) => {

            syncStudentCourseProgress(row.student_id, courseId, false, (syncErr) => {

                if (syncErr && !firstError) {
                    firstError = syncErr;
                }

                remaining -= 1;

                if (remaining === 0) {
                    callback(firstError);
                }

            });

        });

    });

};


const respondWithProgress = (res, statusCode, message, extra, err, progressData) => {

    if (err) {
        return sendServerError(res, err, "Failed to update progress");
    }

    res.status(statusCode).json({
        message,
        progress: progressData,
        ...extra
    });

};


module.exports = {
    completionFromCounts,
    syncStudentCourseProgress,
    ensureProgressRow,
    recalculateCourseProgress,
    respondWithProgress
};
