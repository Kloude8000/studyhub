const db = require("../config/db");


const checkEnrollment = (studentId, courseId, callback) => {

    const sql = `
        SELECT * FROM enrollments
        WHERE student_id = ?
        AND course_id = ?
    `;

    db.query(sql, [studentId, courseId], callback);

};


const createLearningLog = (logData, callback) => {

    const sql = `
        INSERT INTO learning_logs
        (
            student_id,
            course_id,
            topic_id,
            study_duration,
            notes,
            log_date
        )
        VALUES (?, ?, ?, ?, ?, ?)
    `;

    db.query(sql, [
        logData.student_id,
        logData.course_id,
        logData.topic_id,
        logData.study_duration,
        logData.notes,
        logData.log_date
    ], callback);

};


const getTotalStudyTime = (studentId, courseId, callback) => {

    const sql = `
        SELECT SUM(study_duration) AS total
        FROM learning_logs
        WHERE student_id = ?
        AND course_id = ?
    `;

    db.query(sql, [studentId, courseId], callback);

};


const countStudentTopicLogs = (studentId, courseId, callback) => {

    const sql = `
        SELECT COUNT(*) AS total
        FROM learning_logs
        WHERE student_id = ?
        AND course_id = ?
    `;

    db.query(sql, [studentId, courseId], callback);

};


const checkProgressExists = (studentId, courseId, callback) => {

    const sql = `
        SELECT * FROM progress
        WHERE student_id = ?
        AND course_id = ?
    `;

    db.query(sql, [studentId, courseId], callback);

};


const createProgress = (progressData, callback) => {

    const sql = `
        INSERT INTO progress
        (
            student_id,
            course_id,
            total_study_time,
            completion_percentage,
            completed_at,
            last_activity_at
        )
        VALUES (?, ?, ?, ?, ?, ?)
    `;

    db.query(sql, [
        progressData.student_id,
        progressData.course_id,
        progressData.total_study_time,
        progressData.completion_percentage,
        progressData.completed_at,
        progressData.last_activity_at
    ], callback);

};


const updateProgress = (progressData, callback) => {

    const sql = `
        UPDATE progress
        SET
            total_study_time = ?,
            completion_percentage = ?,
            completed_at = ?,
            last_activity_at = COALESCE(?, last_activity_at),
            last_updated = CURRENT_TIMESTAMP
        WHERE student_id = ?
        AND course_id = ?
    `;

    db.query(sql, [
        progressData.total_study_time,
        progressData.completion_percentage,
        progressData.completed_at,
        progressData.last_activity_at,
        progressData.student_id,
        progressData.course_id
    ], callback);

};


const touchLastActivity = (studentId, courseId, callback) => {

    const sql = `
        UPDATE progress
        SET last_activity_at = CURRENT_TIMESTAMP
        WHERE student_id = ? AND course_id = ?
    `;

    db.query(sql, [studentId, courseId], callback);

};


const getStudentProgress = (studentId, callback) => {

    const sql = `
        SELECT
            p.*,
            c.course_code,
            c.course_title,
            (SELECT COUNT(*) FROM course_topics t WHERE t.course_id = p.course_id) AS topics_total,
            (SELECT COUNT(*) FROM learning_logs l
             WHERE l.student_id = p.student_id AND l.course_id = p.course_id) AS topics_completed,
            (SELECT COUNT(*) FROM resource_access ra
             JOIN resources r ON r.resource_id = ra.resource_id
             WHERE ra.student_id = p.student_id
               AND r.course_id = p.course_id
               AND ra.view_count > 0) AS resources_viewed,
            (SELECT COUNT(*) FROM resource_access ra
             JOIN resources r ON r.resource_id = ra.resource_id
             WHERE ra.student_id = p.student_id
               AND r.course_id = p.course_id
               AND ra.downloaded_at IS NOT NULL) AS resources_downloaded
        FROM progress p
        JOIN courses c ON p.course_id = c.course_id
        WHERE p.student_id = ?
    `;

    db.query(sql, [studentId], callback);

};


const getCourseProgress = (courseId, callback) => {

    const sql = `
        SELECT
            p.progress_id,
            e.student_id AS user_id,
            e.course_id,
            COALESCE(p.total_study_time, 0) AS total_study_time,
            COALESCE(p.completion_percentage, 0) AS completion_percentage,
            p.completed_at,
            p.last_activity_at,
            p.last_updated,
            u.full_name AS student_name,
            u.student_id,
            (SELECT COUNT(*) FROM course_topics t WHERE t.course_id = e.course_id) AS topics_total,
            (SELECT COUNT(*) FROM learning_logs l
             WHERE l.student_id = e.student_id AND l.course_id = e.course_id) AS topics_completed,
            (SELECT COUNT(*) FROM resource_access ra
             JOIN resources r ON r.resource_id = ra.resource_id
             WHERE ra.student_id = e.student_id
               AND r.course_id = e.course_id
               AND ra.view_count > 0) AS resources_viewed,
            (SELECT COUNT(*) FROM resource_access ra
             JOIN resources r ON r.resource_id = ra.resource_id
             WHERE ra.student_id = e.student_id
               AND r.course_id = e.course_id
               AND ra.downloaded_at IS NOT NULL) AS resources_downloaded
        FROM enrollments e
        JOIN users u ON e.student_id = u.user_id
        LEFT JOIN progress p
            ON p.student_id = e.student_id AND p.course_id = e.course_id
        WHERE e.course_id = ?
        ORDER BY u.full_name ASC
    `;

    db.query(sql, [courseId], callback);

};


const getStudentTopicChecklist = (studentId, courseId, callback) => {

    const sql = `
        SELECT
            t.topic_id,
            t.title,
            t.sort_order,
            l.log_id,
            l.study_duration,
            l.log_date,
            CASE WHEN l.log_id IS NULL THEN 0 ELSE 1 END AS completed
        FROM course_topics t
        LEFT JOIN learning_logs l
            ON l.topic_id = t.topic_id AND l.student_id = ?
        WHERE t.course_id = ?
        ORDER BY t.sort_order ASC, t.topic_id ASC
    `;

    db.query(sql, [studentId, courseId], callback);

};


const getStudentLearningLogs = (studentId, callback) => {

    const sql = `
        SELECT
            l.log_id,
            l.course_id,
            l.topic_id,
            t.title AS topic,
            l.study_duration,
            l.notes,
            l.log_date,
            l.created_at,
            c.course_code,
            c.course_title
        FROM learning_logs l
        JOIN courses c ON l.course_id = c.course_id
        JOIN course_topics t ON l.topic_id = t.topic_id
        WHERE l.student_id = ?
        ORDER BY l.log_date DESC, l.created_at DESC
    `;

    db.query(sql, [studentId], callback);

};


const getStudentLearningLogsByCourse = (studentId, courseId, callback) => {

    const sql = `
        SELECT
            l.log_id,
            l.course_id,
            l.topic_id,
            t.title AS topic,
            l.study_duration,
            l.notes,
            l.log_date,
            l.created_at,
            c.course_code,
            c.course_title
        FROM learning_logs l
        JOIN courses c ON l.course_id = c.course_id
        JOIN course_topics t ON l.topic_id = t.topic_id
        WHERE l.student_id = ?
        AND l.course_id = ?
        ORDER BY l.log_date DESC, l.created_at DESC
    `;

    db.query(sql, [studentId, courseId], callback);

};


const getLearningLogById = (logId, callback) => {

    const sql = `
        SELECT
            l.*,
            t.title AS topic
        FROM learning_logs l
        JOIN course_topics t ON l.topic_id = t.topic_id
        WHERE l.log_id = ?
    `;

    db.query(sql, [logId], callback);

};


const updateLearningLog = (logId, logData, callback) => {

    const sql = `
        UPDATE learning_logs
        SET
            study_duration = ?,
            notes = ?,
            log_date = ?
        WHERE log_id = ?
    `;

    db.query(sql, [
        logData.study_duration,
        logData.notes,
        logData.log_date,
        logId
    ], callback);

};


const deleteStudentCourseProgress = (studentId, courseId, callback) => {

    const sql = `
        DELETE FROM progress
        WHERE student_id = ? AND course_id = ?
    `;

    db.query(sql, [studentId, courseId], callback);

};


const deleteStudentCourseLearningLogs = (studentId, courseId, callback) => {

    const sql = `
        DELETE FROM learning_logs
        WHERE student_id = ? AND course_id = ?
    `;

    db.query(sql, [studentId, courseId], callback);

};


const deleteCourseLearningLogs = (courseId, callback) => {

    const sql = `
        DELETE FROM learning_logs
        WHERE course_id = ?
    `;

    db.query(sql, [courseId], callback);

};


const deleteCourseProgress = (courseId, callback) => {

    const sql = `
        DELETE FROM progress
        WHERE course_id = ?
    `;

    db.query(sql, [courseId], callback);

};


const deleteCourseResourceAccess = (courseId, callback) => {

    const sql = `
        DELETE ra FROM resource_access ra
        JOIN resources r ON r.resource_id = ra.resource_id
        WHERE r.course_id = ?
    `;

    db.query(sql, [courseId], callback);

};


const deleteStudentCourseResourceAccess = (studentId, courseId, callback) => {

    const sql = `
        DELETE ra FROM resource_access ra
        JOIN resources r ON r.resource_id = ra.resource_id
        WHERE ra.student_id = ? AND r.course_id = ?
    `;

    db.query(sql, [studentId, courseId], callback);

};


const deleteLearningLog = (logId, callback) => {

    const sql = `
        DELETE FROM learning_logs
        WHERE log_id = ?
    `;

    db.query(sql, [logId], callback);

};


const getEnrolledStudentIds = (courseId, callback) => {

    const sql = `
        SELECT student_id
        FROM enrollments
        WHERE course_id = ?
    `;

    db.query(sql, [courseId], callback);

};


module.exports = {
    checkEnrollment,
    createLearningLog,
    getTotalStudyTime,
    countStudentTopicLogs,
    checkProgressExists,
    createProgress,
    updateProgress,
    touchLastActivity,
    getStudentProgress,
    getCourseProgress,
    getStudentTopicChecklist,
    getStudentLearningLogs,
    getStudentLearningLogsByCourse,
    getLearningLogById,
    updateLearningLog,
    deleteStudentCourseProgress,
    deleteStudentCourseLearningLogs,
    deleteStudentCourseResourceAccess,
    deleteCourseLearningLogs,
    deleteCourseProgress,
    deleteCourseResourceAccess,
    deleteLearningLog,
    getEnrolledStudentIds
};
