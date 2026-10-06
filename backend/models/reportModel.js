const db = require("../config/db");

const getLecturerReportRows = (callback) => {
    const sql = `
        SELECT
            u.user_id AS lecturer_id,
            u.full_name AS lecturer_name,
            u.email AS lecturer_email,
            u.created_at AS lecturer_joined,
            (SELECT COUNT(DISTINCT e.student_id)
             FROM courses c2
             JOIN enrollments e ON e.course_id = c2.course_id
             WHERE c2.lecturer_id = u.user_id) AS unique_students,
            c.course_id,
            c.course_code,
            c.course_title,
            (SELECT COUNT(*) FROM enrollments e WHERE e.course_id = c.course_id) AS enrollment_count,
            (SELECT COUNT(*) FROM resources r WHERE r.course_id = c.course_id) AS resource_count,
            (SELECT COUNT(*) FROM course_topics t WHERE t.course_id = c.course_id) AS topic_count,
            (SELECT COALESCE(AVG(p.completion_percentage), 0)
             FROM progress p WHERE p.course_id = c.course_id) AS avg_progress,
            (SELECT COUNT(*)
             FROM enrollments e
             LEFT JOIN progress p
                ON p.student_id = e.student_id AND p.course_id = e.course_id
             WHERE e.course_id = c.course_id
               AND p.completed_at IS NOT NULL) AS completed_count,
            (SELECT COUNT(*)
             FROM enrollments e
             LEFT JOIN progress p
                ON p.student_id = e.student_id AND p.course_id = e.course_id
             WHERE e.course_id = c.course_id
               AND p.completed_at IS NULL
               AND (
                    COALESCE(p.last_activity_at, NULL) IS NOT NULL
                    OR EXISTS (
                        SELECT 1 FROM learning_logs l
                        WHERE l.student_id = e.student_id AND l.course_id = e.course_id
                    )
               )) AS in_progress_count,
            (SELECT COUNT(*)
             FROM enrollments e
             LEFT JOIN progress p
                ON p.student_id = e.student_id AND p.course_id = e.course_id
             WHERE e.course_id = c.course_id
               AND p.completed_at IS NULL
               AND (p.last_activity_at IS NULL
                    OR p.last_activity_at < DATE_SUB(NOW(), INTERVAL 7 DAY))) AS inactive_7d,
            (SELECT COUNT(DISTINCT ra.student_id)
             FROM resource_access ra
             JOIN resources r ON r.resource_id = ra.resource_id
             WHERE r.course_id = c.course_id AND ra.view_count > 0) AS students_viewed,
            (SELECT COUNT(DISTINCT ra.student_id)
             FROM resource_access ra
             JOIN resources r ON r.resource_id = ra.resource_id
             WHERE r.course_id = c.course_id AND ra.downloaded_at IS NOT NULL) AS students_downloaded
        FROM users u
        LEFT JOIN courses c ON c.lecturer_id = u.user_id
        WHERE u.role = 'lecturer'
        ORDER BY u.full_name ASC, c.course_code ASC
    `;
    db.query(sql, callback);
};

const getLecturerCourseStudents = (lecturerId, callback) => {
    const sql = `
        SELECT
            c.course_id,
            u.user_id AS student_user_id,
            u.full_name AS student_name,
            u.student_id AS student_number,
            COALESCE(p.total_study_time, 0) AS total_study_time,
            COALESCE(p.completion_percentage, 0) AS completion_percentage,
            p.completed_at,
            p.last_activity_at,
            (SELECT COUNT(*) FROM course_topics t WHERE t.course_id = c.course_id) AS topics_total,
            (SELECT COUNT(*) FROM learning_logs l
             WHERE l.student_id = e.student_id AND l.course_id = c.course_id) AS topics_completed
        FROM courses c
        JOIN enrollments e ON e.course_id = c.course_id
        JOIN users u ON u.user_id = e.student_id
        LEFT JOIN progress p
            ON p.student_id = e.student_id AND p.course_id = c.course_id
        WHERE c.lecturer_id = ?
        ORDER BY c.course_code ASC, u.full_name ASC
    `;
    db.query(sql, [lecturerId], callback);
};

const getStudentReportRows = (filters, callback) => {
    const { courseId, status } = filters;
    const conditions = ["u.role = 'student'"];
    const params = [];

    if (courseId) {
        conditions.push(`EXISTS (
            SELECT 1 FROM enrollments e
            WHERE e.student_id = u.user_id AND e.course_id = ?
        )`);
        params.push(courseId);
    }

    if (status === "enrolled") {
        conditions.push(`EXISTS (
            SELECT 1 FROM enrollments e WHERE e.student_id = u.user_id
        )`);
    } else if (status === "unenrolled") {
        conditions.push(`NOT EXISTS (
            SELECT 1 FROM enrollments e WHERE e.student_id = u.user_id
        )`);
    }

    const sql = `
        SELECT
            u.user_id AS student_id,
            u.full_name AS student_name,
            u.email AS student_email,
            u.student_id AS student_number,
            u.created_at AS student_joined,
            (SELECT COUNT(*) FROM enrollments e WHERE e.student_id = u.user_id) AS courses_enrolled,
            (SELECT COUNT(*)
             FROM enrollments e
             JOIN progress p ON p.student_id = e.student_id AND p.course_id = e.course_id
             WHERE e.student_id = u.user_id AND p.completed_at IS NOT NULL) AS courses_completed,
            (SELECT COALESCE(AVG(p.completion_percentage), 0)
             FROM progress p WHERE p.student_id = u.user_id) AS avg_progress,
            (SELECT COALESCE(SUM(p.total_study_time), 0)
             FROM progress p WHERE p.student_id = u.user_id) AS total_study_time,
            (SELECT MAX(p.last_activity_at)
             FROM progress p WHERE p.student_id = u.user_id) AS last_activity_at,
            (SELECT MAX(l.log_date) FROM learning_logs l WHERE l.student_id = u.user_id) AS last_log_date,
            (SELECT COUNT(*) FROM resource_access ra
             WHERE ra.student_id = u.user_id AND ra.view_count > 0) AS resources_viewed,
            (SELECT COUNT(*) FROM resource_access ra
             WHERE ra.student_id = u.user_id AND ra.downloaded_at IS NOT NULL) AS resources_downloaded,
            CASE
                WHEN EXISTS (SELECT 1 FROM enrollments e WHERE e.student_id = u.user_id)
                THEN 'Enrolled' ELSE 'Unenrolled'
            END AS enrollment_status
        FROM users u
        WHERE ${conditions.join(" AND ")}
        ORDER BY u.full_name ASC
    `;
    db.query(sql, params, callback);
};

const getStudentCourseBreakdown = (studentId, callback) => {
    const sql = `
        SELECT
            c.course_id,
            c.course_code,
            c.course_title,
            lec.full_name AS lecturer_name,
            e.enrolled_at,
            COALESCE(p.completion_percentage, 0) AS completion_percentage,
            COALESCE(p.total_study_time, 0) AS total_study_time,
            p.completed_at,
            p.last_activity_at,
            (SELECT COUNT(*) FROM course_topics t WHERE t.course_id = c.course_id) AS topics_total,
            (SELECT COUNT(*) FROM learning_logs l
             WHERE l.student_id = e.student_id AND l.course_id = c.course_id) AS topics_completed,
            (SELECT COUNT(*) FROM resources r WHERE r.course_id = c.course_id) AS resources_total,
            (SELECT COUNT(*) FROM resource_access ra
             JOIN resources r ON r.resource_id = ra.resource_id
             WHERE ra.student_id = e.student_id
               AND r.course_id = c.course_id
               AND ra.view_count > 0) AS resources_viewed,
            (SELECT COUNT(*) FROM resource_access ra
             JOIN resources r ON r.resource_id = ra.resource_id
             WHERE ra.student_id = e.student_id
               AND r.course_id = c.course_id
               AND ra.downloaded_at IS NOT NULL) AS resources_downloaded
        FROM enrollments e
        JOIN courses c ON e.course_id = c.course_id
        JOIN users lec ON lec.user_id = c.lecturer_id
        LEFT JOIN progress p
            ON p.student_id = e.student_id AND p.course_id = e.course_id
        WHERE e.student_id = ?
        ORDER BY c.course_code ASC
    `;
    db.query(sql, [studentId], callback);
};

const getStudentTopicChecklist = (studentId, callback) => {
    const sql = `
        SELECT
            t.course_id,
            t.topic_id,
            t.title,
            t.sort_order,
            l.log_date,
            l.study_duration,
            CASE WHEN l.log_id IS NULL THEN 0 ELSE 1 END AS completed
        FROM enrollments e
        JOIN course_topics t ON t.course_id = e.course_id
        LEFT JOIN learning_logs l
            ON l.topic_id = t.topic_id AND l.student_id = e.student_id
        WHERE e.student_id = ?
        ORDER BY t.course_id ASC, t.sort_order ASC, t.topic_id ASC
    `;
    db.query(sql, [studentId], callback);
};

module.exports = {
    getLecturerReportRows,
    getLecturerCourseStudents,
    getStudentReportRows,
    getStudentCourseBreakdown,
    getStudentTopicChecklist
};
