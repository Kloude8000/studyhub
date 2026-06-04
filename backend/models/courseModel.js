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

    const sql = `
        UPDATE courses
        SET course_code = ?, course_title = ?, description = ?
        WHERE course_id = ?
    `;

    db.query(sql, [
        data.course_code,
        data.course_title,
        data.description,
        id
    ], callback);

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
    getCourseById,
    getCoursesByLecturer,
    updateCourse,
    updateCourseById,
    deleteCourse,
    deleteCourseById
};