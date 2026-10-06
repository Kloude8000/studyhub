const db = require("../config/db");



// ================= CREATE RESOURCE =================
const createResource = (resourceData, callback) => {

    const sql = `
        INSERT INTO resources
        (course_id, uploaded_by, title, file_path, file_type)
        VALUES (?, ?, ?, ?, ?)
    `;

    db.query(sql, [
        resourceData.course_id,
        resourceData.uploaded_by,
        resourceData.title,
        resourceData.file_path,
        resourceData.file_type
    ], callback);

};



// ================= GET COURSE RESOURCES =================
const getResourcesByCourse = (courseId, callback) => {

    const sql = `
        SELECT 
            r.*,
            u.full_name AS uploader_name
        FROM resources r
        JOIN users u ON r.uploaded_by = u.user_id
        WHERE r.course_id = ?
    `;

    db.query(sql, [courseId], callback);

};



const getResourcesByCourseForStudent = (courseId, studentId, callback) => {

    const sql = `
        SELECT
            r.*,
            u.full_name AS uploader_name,
            COALESCE(ra.view_count, 0) AS view_count,
            ra.first_viewed_at,
            ra.last_viewed_at,
            ra.downloaded_at
        FROM resources r
        JOIN users u ON r.uploaded_by = u.user_id
        LEFT JOIN resource_access ra
            ON ra.resource_id = r.resource_id AND ra.student_id = ?
        WHERE r.course_id = ?
    `;

    db.query(sql, [studentId, courseId], callback);

};



const recordResourceView = (studentId, resourceId, callback) => {

    const sql = `
        INSERT INTO resource_access
            (student_id, resource_id, view_count, first_viewed_at, last_viewed_at)
        VALUES (?, ?, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        ON DUPLICATE KEY UPDATE
            view_count = view_count + 1,
            first_viewed_at = COALESCE(first_viewed_at, CURRENT_TIMESTAMP),
            last_viewed_at = CURRENT_TIMESTAMP
    `;

    db.query(sql, [studentId, resourceId], callback);

};



const recordResourceDownload = (studentId, resourceId, callback) => {

    const sql = `
        INSERT INTO resource_access
            (student_id, resource_id, view_count, downloaded_at)
        VALUES (?, ?, 0, CURRENT_TIMESTAMP)
        ON DUPLICATE KEY UPDATE
            downloaded_at = COALESCE(downloaded_at, CURRENT_TIMESTAMP)
    `;

    db.query(sql, [studentId, resourceId], callback);

};



// ================= GET RESOURCE BY ID =================
const getResourceById = (resourceId, callback) => {

    const sql = `
        SELECT * FROM resources
        WHERE resource_id = ?
    `;

    db.query(sql, [resourceId], callback);

};



// ================= DELETE RESOURCE =================
const deleteResource = (resourceId, uploadedBy, callback) => {

    const sql = `
        DELETE FROM resources
        WHERE resource_id = ?
        AND uploaded_by = ?
    `;

    db.query(sql, [resourceId, uploadedBy], callback);

};



// ================= DELETE RESOURCE BY ID =================
const deleteResourceById = (resourceId, callback) => {

    const sql = `
        DELETE FROM resources
        WHERE resource_id = ?
    `;

    db.query(sql, [resourceId], callback);

};



const deleteResourcesByCourse = (courseId, callback) => {

    const sql = `
        DELETE FROM resources
        WHERE course_id = ?
    `;

    db.query(sql, [courseId], callback);

};



module.exports = {
    createResource,
    getResourcesByCourse,
    getResourcesByCourseForStudent,
    getResourceById,
    recordResourceView,
    recordResourceDownload,
    deleteResource,
    deleteResourceById,
    deleteResourcesByCourse
};