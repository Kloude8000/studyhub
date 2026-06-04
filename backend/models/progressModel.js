const db = require("../config/db");



// ================= CHECK ENROLLMENT =================
const checkEnrollment = (
    studentId,
    courseId,
    callback
) => {

    const sql = `
        SELECT * FROM enrollments
        WHERE student_id = ?
        AND course_id = ?
    `;

    db.query(sql, [studentId, courseId], callback);

};



// ================= CREATE LEARNING LOG =================
const createLearningLog = (
    logData,
    callback
) => {

    const sql = `
        INSERT INTO learning_logs
        (
            student_id,
            course_id,
            topic,
            study_duration,
            notes,
            log_date
        )
        VALUES (?, ?, ?, ?, ?, ?)
    `;

    db.query(sql, [
        logData.student_id,
        logData.course_id,
        logData.topic,
        logData.study_duration,
        logData.notes,
        logData.log_date
    ], callback);

};



// ================= GET TOTAL STUDY TIME =================
const getTotalStudyTime = (
    studentId,
    courseId,
    callback
) => {

    const sql = `
        SELECT SUM(study_duration) AS total
        FROM learning_logs
        WHERE student_id = ?
        AND course_id = ?
    `;

    db.query(sql, [studentId, courseId], callback);

};



// ================= CHECK EXISTING PROGRESS =================
const checkProgressExists = (
    studentId,
    courseId,
    callback
) => {

    const sql = `
        SELECT * FROM progress
        WHERE student_id = ?
        AND course_id = ?
    `;

    db.query(sql, [studentId, courseId], callback);

};



// ================= CREATE PROGRESS =================
const createProgress = (
    progressData,
    callback
) => {

    const sql = `
        INSERT INTO progress
        (
            student_id,
            course_id,
            total_study_time,
            completion_percentage
        )
        VALUES (?, ?, ?, ?)
    `;

    db.query(sql, [
        progressData.student_id,
        progressData.course_id,
        progressData.total_study_time,
        progressData.completion_percentage
    ], callback);

};



// ================= UPDATE PROGRESS =================
const updateProgress = (
    progressData,
    callback
) => {

    const sql = `
        UPDATE progress
        SET
            total_study_time = ?,
            completion_percentage = ?,
            last_updated = CURRENT_TIMESTAMP
        WHERE student_id = ?
        AND course_id = ?
    `;

    db.query(sql, [
        progressData.total_study_time,
        progressData.completion_percentage,
        progressData.student_id,
        progressData.course_id
    ], callback);

};



// ================= GET STUDENT PROGRESS =================
const getStudentProgress = (
    studentId,
    callback
) => {

    const sql = `
        SELECT
            p.*,
            c.course_code,
            c.course_title
        FROM progress p
        JOIN courses c
        ON p.course_id = c.course_id
        WHERE p.student_id = ?
    `;

    db.query(sql, [studentId], callback);

};



// ================= GET COURSE PROGRESS =================
const getCourseProgress = (
    courseId,
    callback
) => {

    const sql = `
        SELECT
            p.*,
            u.full_name AS student_name
        FROM progress p
        JOIN users u
        ON p.student_id = u.user_id
        WHERE p.course_id = ?
    `;

    db.query(sql, [courseId], callback);

};



// ================= GET STUDENT LEARNING LOGS =================
const getStudentLearningLogs = (studentId, callback) => {

    const sql = `
        SELECT
            l.log_id,
            l.course_id,
            l.topic,
            l.study_duration,
            l.notes,
            l.log_date,
            l.created_at,
            c.course_code,
            c.course_title
        FROM learning_logs l
        JOIN courses c ON l.course_id = c.course_id
        WHERE l.student_id = ?
        ORDER BY l.log_date DESC, l.created_at DESC
    `;

    db.query(sql, [studentId], callback);

};



// ================= GET STUDENT LEARNING LOGS BY COURSE =================
const getStudentLearningLogsByCourse = (
    studentId,
    courseId,
    callback
) => {

    const sql = `
        SELECT
            l.log_id,
            l.course_id,
            l.topic,
            l.study_duration,
            l.notes,
            l.log_date,
            l.created_at,
            c.course_code,
            c.course_title
        FROM learning_logs l
        JOIN courses c ON l.course_id = c.course_id
        WHERE l.student_id = ?
        AND l.course_id = ?
        ORDER BY l.log_date DESC, l.created_at DESC
    `;

    db.query(sql, [studentId, courseId], callback);

};



// ================= GET LEARNING LOG BY ID =================
const getLearningLogById = (logId, callback) => {

    const sql = `
        SELECT * FROM learning_logs
        WHERE log_id = ?
    `;

    db.query(sql, [logId], callback);

};



// ================= UPDATE LEARNING LOG =================
const updateLearningLog = (logId, logData, callback) => {

    const sql = `
        UPDATE learning_logs
        SET
            topic = ?,
            study_duration = ?,
            notes = ?,
            log_date = ?
        WHERE log_id = ?
    `;

    db.query(sql, [
        logData.topic,
        logData.study_duration,
        logData.notes,
        logData.log_date,
        logId
    ], callback);

};



module.exports = {
    checkEnrollment,
    createLearningLog,
    getTotalStudyTime,
    checkProgressExists,
    createProgress,
    updateProgress,
    getStudentProgress,
    getCourseProgress,
    getStudentLearningLogs,
    getStudentLearningLogsByCourse,
    getLearningLogById,
    updateLearningLog
};