const db = require("../config/db");



// ================= CHECK COURSE EXISTS =================
const checkCourseExists = (courseId, callback) => {

    const sql = `
        SELECT * FROM courses
        WHERE course_id = ?
    `;

    db.query(sql, [courseId], callback);

};



// ================= CHECK EXISTING ENROLLMENT =================
const checkEnrollment = (studentId, courseId, callback) => {

    const sql = `
        SELECT * FROM enrollments
        WHERE student_id = ? AND course_id = ?
    `;

    db.query(sql, [studentId, courseId], callback);

};



// ================= ENROLL STUDENT =================
const enrollStudent = (studentId, courseId, callback) => {

    const sql = `
        INSERT INTO enrollments
        (student_id, course_id)
        VALUES (?, ?)
    `;

    db.query(sql, [studentId, courseId], callback);

};



// ================= GET STUDENT ENROLLMENTS =================
const getStudentEnrollments = (studentId, callback) => {

    const sql = `
        SELECT 
            e.enrollment_id,
            e.enrolled_at,
            c.course_id,
            c.course_code,
            c.course_title,
            u.full_name AS lecturer_name
        FROM enrollments e
        JOIN courses c ON e.course_id = c.course_id
        JOIN users u ON c.lecturer_id = u.user_id
        WHERE e.student_id = ?
    `;

    db.query(sql, [studentId], callback);

};



// ================= GET COURSE ENROLLMENTS =================
const getCourseEnrollments = (courseId, callback) => {

    const sql = `
        SELECT 
            e.enrollment_id,
            e.enrolled_at,
            u.user_id,
            u.student_id,
            u.full_name,
            u.email
        FROM enrollments e
        JOIN users u ON e.student_id = u.user_id
        WHERE e.course_id = ?
    `;

    db.query(sql, [courseId], callback);

};



// ================= DELETE ENROLLMENT =================
const deleteEnrollment = (studentId, courseId, callback) => {

    const sql = `
        DELETE FROM enrollments
        WHERE student_id = ? AND course_id = ?
    `;

    db.query(sql, [studentId, courseId], callback);

};



const deleteEnrollmentsByCourse = (courseId, callback) => {

    const sql = `
        DELETE FROM enrollments
        WHERE course_id = ?
    `;

    db.query(sql, [courseId], callback);

};



// ================= GET TOTAL ENROLLMENTS =================
const getTotalEnrollmentCount = (callback) => {

    const sql = `
        SELECT COUNT(*) AS total
        FROM enrollments
    `;

    db.query(sql, callback);

};



// ================= GET ALL ENROLLMENTS (admin overview) =================
const getAllEnrollmentsDetailed = (callback) => {

    const sql = `
        SELECT
            e.enrollment_id,
            e.enrolled_at,
            u.user_id,
            u.full_name,
            u.email,
            u.student_id,
            c.course_id,
            c.course_code,
            c.course_title,
            l.full_name AS lecturer_name
        FROM enrollments e
        JOIN users u ON e.student_id = u.user_id
        JOIN courses c ON e.course_id = c.course_id
        JOIN users l ON c.lecturer_id = l.user_id
        ORDER BY c.course_code ASC, u.full_name ASC
    `;

    db.query(sql, callback);

};



const getStudentsNotInCourse = (courseId, callback) => {

    const sql = `
        SELECT
            u.user_id,
            u.full_name,
            u.email,
            u.student_id
        FROM users u
        WHERE u.role = 'student'
          AND u.user_id NOT IN (
              SELECT e.student_id
              FROM enrollments e
              WHERE e.course_id = ?
          )
        ORDER BY u.full_name ASC
    `;

    db.query(sql, [courseId], callback);

};



module.exports = {
    checkCourseExists,
    checkEnrollment,
    enrollStudent,
    deleteEnrollment,
    deleteEnrollmentsByCourse,
    getStudentEnrollments,
    getCourseEnrollments,
    getTotalEnrollmentCount,
    getAllEnrollmentsDetailed,
    getStudentsNotInCourse
};