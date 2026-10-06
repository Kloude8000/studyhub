const db = require("../config/db");


// ================= CREATE COURSE =================
const createCourse = (courseData, callback) => {

    const sql = `
        INSERT INTO courses
        (course_code, course_title, description, lecturer_id)
        VALUES (?, ?, ?, ?)
    `;

    db.query(sql, [
        courseData.course_code,
        courseData.course_title,
        courseData.description,
        courseData.lecturer_id
    ], callback);

};



// ================= GET ALL COURSES =================
const getAllCourses = (callback) => {

    const sql = `
        SELECT 
            c.*,
            u.full_name AS lecturer_name
        FROM courses c
        JOIN users u ON c.lecturer_id = u.user_id
    `;

    db.query(sql, callback);

};



// ================= GET COURSE BY ID =================
const getCourseById = (id, callback) => {

    const sql = `
        SELECT 
            c.*,
            u.full_name AS lecturer_name
        FROM courses c
        JOIN users u ON c.lecturer_id = u.user_id
        WHERE c.course_id = ?
    `;

    db.query(sql, [id], callback);

};



// ================= GET COURSES WITH STUDENT COUNTS (admin) =================
const getCoursesWithStudentCounts = (callback) => {

    const sql = `
        SELECT
            c.course_id,
            c.course_code,
            c.course_title,
            u.full_name AS lecturer_name,
            COUNT(e.enrollment_id) AS student_count
        FROM courses c
        JOIN users u ON c.lecturer_id = u.user_id
        LEFT JOIN enrollments e ON e.course_id = c.course_id
        GROUP BY c.course_id, c.course_code, c.course_title, u.full_name
        ORDER BY c.course_code ASC
    `;

    db.query(sql, callback);

};



// ================= GET COURSES BY LECTURER =================
const getCoursesByLecturer = (lecturerId, callback) => {

    const sql = `
        SELECT * FROM courses
        WHERE lecturer_id = ?
    `;

    db.query(sql, [lecturerId], callback);

};



// ================= UPDATE COURSE =================
const updateCourse = (id, lecturerId, data, callback) => {

    const sql = `
        UPDATE courses
        SET course_code = ?, course_title = ?, description = ?
        WHERE course_id = ? AND lecturer_id = ?
    `;

    db.query(sql, [
        data.course_code,
        data.course_title,
        data.description,
        id,
        lecturerId
    ], callback);

};



// ================= UPDATE COURSE (ADMIN) =================
const updateCourseById = (id, data, callback) => {

    const fields = ["course_code = ?", "course_title = ?", "description = ?"];
    const values = [data.course_code, data.course_title, data.description];

    if (data.lecturer_id != null) {
        fields.push("lecturer_id = ?");
        values.push(data.lecturer_id);
    }

    values.push(id);

    const sql = `
        UPDATE courses
        SET ${fields.join(", ")}
        WHERE course_id = ?
    `;

    db.query(sql, values, callback);

};



// ================= DELETE COURSE =================
const deleteCourse = (id, lecturerId, callback) => {

    const sql = `
        DELETE FROM courses
        WHERE course_id = ? AND lecturer_id = ?
    `;

    db.query(sql, [id, lecturerId], callback);

};



// ================= DELETE COURSE (ADMIN) =================
const deleteCourseById = (id, callback) => {

    const sql = `
        DELETE FROM courses
        WHERE course_id = ?
    `;

    db.query(sql, [id], callback);

};



module.exports = {
    createCourse,
    getAllCourses,
    getCoursesWithStudentCounts,
    getCourseById,
    getCoursesByLecturer,
    updateCourse,
    updateCourseById,
    deleteCourse,
    deleteCourseById
};