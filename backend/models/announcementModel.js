const db = require("../config/db");


const listByCourse = (courseId, callback) => {

    const sql = `
        SELECT
            a.announcement_id,
            a.author_id,
            a.scope,
            a.course_id,
            a.title,
            a.body,
            a.created_at,
            u.full_name AS author_name
        FROM announcements a
        JOIN users u ON u.user_id = a.author_id
        WHERE a.scope = 'course' AND a.course_id = ?
        ORDER BY a.created_at DESC, a.announcement_id DESC
    `;

    db.query(sql, [courseId], callback);

};


const listPlatform = (callback) => {

    const sql = `
        SELECT
            a.announcement_id,
            a.author_id,
            a.scope,
            a.course_id,
            a.title,
            a.body,
            a.created_at,
            u.full_name AS author_name
        FROM announcements a
        JOIN users u ON u.user_id = a.author_id
        WHERE a.scope = 'platform'
        ORDER BY a.created_at DESC, a.announcement_id DESC
    `;

    db.query(sql, callback);

};


const getById = (announcementId, callback) => {

    const sql = `
        SELECT
            announcement_id,
            author_id,
            scope,
            course_id,
            title,
            body,
            created_at
        FROM announcements
        WHERE announcement_id = ?
    `;

    db.query(sql, [announcementId], callback);

};


const create = (data, callback) => {

    const sql = `
        INSERT INTO announcements (author_id, scope, course_id, title, body)
        VALUES (?, ?, ?, ?, ?)
    `;

    db.query(
        sql,
        [
            data.author_id,
            data.scope,
            data.course_id || null,
            data.title,
            data.body || null
        ],
        callback
    );

};


const deleteById = (announcementId, callback) => {

    const sql = `
        DELETE FROM announcements
        WHERE announcement_id = ?
    `;

    db.query(sql, [announcementId], callback);

};


const updateById = (announcementId, data, callback) => {

    const sql = `
        UPDATE announcements
        SET title = ?, body = ?
        WHERE announcement_id = ?
    `;

    db.query(
        sql,
        [
            data.title,
            data.body || null,
            announcementId
        ],
        callback
    );

};


const deleteByCourse = (courseId, callback) => {

    const sql = `
        DELETE FROM announcements
        WHERE course_id = ?
    `;

    db.query(sql, [courseId], callback);

};


module.exports = {
    listByCourse,
    listPlatform,
    getById,
    create,
    updateById,
    deleteById,
    deleteByCourse
};
