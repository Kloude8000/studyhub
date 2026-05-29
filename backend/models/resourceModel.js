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



// ================= DELETE RESOURCE =================
const deleteResource = (resourceId, uploadedBy, callback) => {

    const sql = `
        DELETE FROM resources
        WHERE resource_id = ?
        AND uploaded_by = ?
    `;

    db.query(sql, [resourceId, uploadedBy], callback);

};



// ================= CHECK COURSE OWNERSHIP =================
const checkCourseOwnership = (
    courseId,
    lecturerId,
    callback
) => {

    const sql = `
        SELECT * FROM courses
        WHERE course_id = ?
        AND lecturer_id = ?
    `;

    db.query(sql, [courseId, lecturerId], callback);

};



module.exports = {
    createResource,
    getResourcesByCourse,
    deleteResource,
    checkCourseOwnership
};