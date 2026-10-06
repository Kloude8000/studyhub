const db = require("../config/db");


const getTopicsByCourse = (courseId, callback) => {

    const sql = `
        SELECT topic_id, course_id, title, sort_order, created_at
        FROM course_topics
        WHERE course_id = ?
        ORDER BY sort_order ASC, topic_id ASC
    `;

    db.query(sql, [courseId], callback);

};


const getTopicById = (topicId, callback) => {

    const sql = `
        SELECT topic_id, course_id, title, sort_order, created_at
        FROM course_topics
        WHERE topic_id = ?
    `;

    db.query(sql, [topicId], callback);

};


const getNextSortOrder = (courseId, callback) => {

    const sql = `
        SELECT COALESCE(MAX(sort_order), 0) + 1 AS next_order
        FROM course_topics
        WHERE course_id = ?
    `;

    db.query(sql, [courseId], callback);

};


const createTopic = (courseId, title, sortOrder, callback) => {

    const sql = `
        INSERT INTO course_topics (course_id, title, sort_order)
        VALUES (?, ?, ?)
    `;

    db.query(sql, [courseId, title, sortOrder], callback);

};


const updateTopic = (topicId, title, sortOrder, callback) => {

    const sql = `
        UPDATE course_topics
        SET title = ?, sort_order = ?
        WHERE topic_id = ?
    `;

    db.query(sql, [title, sortOrder, topicId], callback);

};


const countLogsForTopic = (topicId, callback) => {

    const sql = `
        SELECT COUNT(*) AS log_count
        FROM learning_logs
        WHERE topic_id = ?
    `;

    db.query(sql, [topicId], callback);

};


const deleteTopic = (topicId, callback) => {

    const sql = `
        DELETE FROM course_topics
        WHERE topic_id = ?
    `;

    db.query(sql, [topicId], callback);

};


const deleteTopicsByCourse = (courseId, callback) => {

    const sql = `
        DELETE FROM course_topics
        WHERE course_id = ?
    `;

    db.query(sql, [courseId], callback);

};


const countCourseTopics = (courseId, callback) => {

    const sql = `
        SELECT COUNT(*) AS total
        FROM course_topics
        WHERE course_id = ?
    `;

    db.query(sql, [courseId], callback);

};


module.exports = {
    getTopicsByCourse,
    getTopicById,
    getNextSortOrder,
    createTopic,
    updateTopic,
    countLogsForTopic,
    deleteTopic,
    deleteTopicsByCourse,
    countCourseTopics
};
