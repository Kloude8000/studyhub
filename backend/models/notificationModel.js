const db = require("../config/db");


const create = (data, callback) => {

    const sql = `
        INSERT INTO notifications (user_id, type, title, body, link_url)
        VALUES (?, ?, ?, ?, ?)
    `;

    db.query(
        sql,
        [
            data.user_id,
            data.type,
            data.title,
            data.body || null,
            data.link_url || null
        ],
        callback
    );

};


const createMany = (rows, callback) => {

    if (!rows || rows.length === 0) {
        return callback(null, { affectedRows: 0 });
    }

    const placeholders = rows.map(() => "(?, ?, ?, ?, ?)").join(", ");
    const sql = `
        INSERT INTO notifications (user_id, type, title, body, link_url)
        VALUES ${placeholders}
    `;
    const params = [];

    rows.forEach((row) => {
        params.push(
            row.user_id,
            row.type,
            row.title,
            row.body || null,
            row.link_url || null
        );
    });

    db.query(sql, params, callback);

};


const listForUser = (userId, limit, callback) => {

    const sql = `
        SELECT notification_id, user_id, type, title, body, link_url, is_read, created_at
        FROM notifications
        WHERE user_id = ?
        ORDER BY created_at DESC, notification_id DESC
        LIMIT ?
    `;

    db.query(sql, [userId, Number(limit) || 30], callback);

};


const countUnread = (userId, callback) => {

    const sql = `
        SELECT COUNT(*) AS total
        FROM notifications
        WHERE user_id = ? AND is_read = 0
    `;

    db.query(sql, [userId], callback);

};


const markRead = (notificationId, userId, callback) => {

    const sql = `
        UPDATE notifications
        SET is_read = 1
        WHERE notification_id = ? AND user_id = ?
    `;

    db.query(sql, [notificationId, userId], callback);

};


const markAllRead = (userId, callback) => {

    const sql = `
        UPDATE notifications
        SET is_read = 1
        WHERE user_id = ? AND is_read = 0
    `;

    db.query(sql, [userId], callback);

};


module.exports = {
    create,
    createMany,
    listForUser,
    countUnread,
    markRead,
    markAllRead
};
