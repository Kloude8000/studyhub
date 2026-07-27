const db = require("../config/db");

const createAnnouncement = (data, callback) => {
    const sql = `
        INSERT INTO announcements (course_id, title, body, created_by)
        VALUES (?, ?, ?, ?)
    `;

    db.query(
        sql,
        [data.course_id, data.title, data.body, data.created_by],
        callback
    );
};

const getAnnouncementsByCourse = (courseId, callback) => {
    const sql = `
        SELECT
            a.announcement_id,
            a.course_id,
            a.title,
            a.body,
            a.created_at,
            u.full_name AS author_name
        FROM announcements a
        JOIN users u ON a.created_by = u.user_id
        WHERE a.course_id = ?
        ORDER BY a.created_at DESC
    `;

    db.query(sql, [courseId], callback);
};

const getAnnouncementById = (announcementId, callback) => {
    const sql = `
        SELECT * FROM announcements
        WHERE announcement_id = ?
    `;

    db.query(sql, [announcementId], callback);
};

const deleteAnnouncement = (announcementId, callback) => {
    const sql = `
        DELETE FROM announcements
        WHERE announcement_id = ?
    `;

    db.query(sql, [announcementId], callback);
};

module.exports = {
    createAnnouncement,
    getAnnouncementsByCourse,
    getAnnouncementById,
    deleteAnnouncement
};
