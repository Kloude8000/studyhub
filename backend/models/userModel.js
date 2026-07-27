const db = require("../config/db");


const findUserByEmail = (email, callback) => {
    const sql = "SELECT * FROM users WHERE email = ?";
    db.query(sql, [email], callback);
};


const findUserById = (userId, callback) => {
    const sql = `
        SELECT user_id, full_name, email, role, created_at
        FROM users
        WHERE user_id = ?
    `;

    db.query(sql, [userId], callback);
};


const createUser = (userData, callback) => {
    const sql = `
        INSERT INTO users
        (full_name, email, password_hash, role)
        VALUES (?, ?, ?, ?)
    `;

    db.query(
        sql,
        [
            userData.full_name,
            userData.email,
            userData.password_hash,
            userData.role
        ],
        callback
    );
};


const updateUserProfile = (userId, data, callback) => {
    const sql = `
        UPDATE users
        SET full_name = ?, email = ?
        WHERE user_id = ?
    `;

    db.query(sql, [data.full_name, data.email, userId], callback);
};


const updateUserPassword = (userId, passwordHash, callback) => {
    const sql = `
        UPDATE users
        SET password_hash = ?
        WHERE user_id = ?
    `;

    db.query(sql, [passwordHash, userId], callback);
};


const getUsers = (role, callback) => {
    let sql = `
        SELECT user_id, full_name, email, role, created_at
        FROM users
    `;
    const params = [];

    if (role) {
        sql += " WHERE role = ?";
        params.push(role);
    }

    sql += " ORDER BY full_name ASC";

    db.query(sql, params, callback);
};


const getUsersByCategory = (category, courseId, callback) => {
    if (category === "lecturers") {
        const sql = `
            SELECT
                u.user_id,
                u.full_name,
                u.email,
                u.role,
                u.created_at,
                COUNT(DISTINCT c.course_id) AS courses_taught,
                COUNT(DISTINCT e.enrollment_id) AS total_students
            FROM users u
            LEFT JOIN courses c ON c.lecturer_id = u.user_id
            LEFT JOIN enrollments e ON e.course_id = c.course_id
            WHERE u.role = 'lecturer'
            GROUP BY u.user_id, u.full_name, u.email, u.role, u.created_at
            ORDER BY u.full_name ASC
        `;
        return db.query(sql, callback);
    }

    if (category === "admins") {
        const sql = `
            SELECT user_id, full_name, email, role, created_at
            FROM users
            WHERE role = 'admin'
            ORDER BY full_name ASC
        `;
        return db.query(sql, callback);
    }

    if (category === "not_enrolled") {
        const sql = `
            SELECT
                u.user_id,
                u.full_name,
                u.email,
                u.role,
                u.created_at,
                0 AS enrollment_count
            FROM users u
            LEFT JOIN enrollments e ON e.student_id = u.user_id
            WHERE u.role = 'student'
            AND e.enrollment_id IS NULL
            ORDER BY u.full_name ASC
        `;
        return db.query(sql, callback);
    }

    if (category === "students_by_course") {
        if (!courseId) {
            return callback(null, []);
        }

        const sql = `
            SELECT
                u.user_id,
                u.full_name,
                u.email,
                u.role,
                u.created_at,
                e.enrollment_id,
                e.enrolled_at,
                c.course_id,
                c.course_code,
                c.course_title,
                COALESCE(p.completion_percentage, 0) AS completion_percentage,
                COALESCE(p.total_study_time, 0) AS total_study_time
            FROM enrollments e
            JOIN users u ON u.user_id = e.student_id
            JOIN courses c ON c.course_id = e.course_id
            LEFT JOIN progress p
                ON p.student_id = u.user_id AND p.course_id = c.course_id
            WHERE e.course_id = ?
            AND u.role = 'student'
            ORDER BY u.full_name ASC
        `;
        return db.query(sql, [courseId], callback);
    }

    return callback(new Error("Invalid category"));
};


const getCategoryCounts = (callback) => {
    const sql = `
        SELECT
            (SELECT COUNT(*) FROM users WHERE role = 'lecturer') AS lecturers,
            (SELECT COUNT(*) FROM users WHERE role = 'admin') AS admins,
            (
                SELECT COUNT(*)
                FROM users u
                LEFT JOIN enrollments e ON e.student_id = u.user_id
                WHERE u.role = 'student' AND e.enrollment_id IS NULL
            ) AS not_enrolled,
            (SELECT COUNT(*) FROM users WHERE role = 'student') AS students
    `;

    db.query(sql, callback);
};


const getReportUsers = (callback) => {
    const sql = `
        SELECT
            u.user_id,
            u.full_name,
            u.email,
            u.role,
            u.created_at,
            COUNT(DISTINCT e.enrollment_id) AS enrollment_count,
            COUNT(DISTINCT c.course_id) AS courses_taught
        FROM users u
        LEFT JOIN enrollments e ON u.user_id = e.student_id AND u.role = 'student'
        LEFT JOIN courses c ON u.user_id = c.lecturer_id AND u.role = 'lecturer'
        WHERE u.role IN ('student', 'lecturer')
        GROUP BY u.user_id, u.full_name, u.email, u.role, u.created_at
        ORDER BY u.role ASC, u.full_name ASC
    `;

    db.query(sql, callback);
};


const getStudentReportRows = (filters, callback) => {
    const { status, courseId } = filters;
    const params = [];

    let sql = `
        SELECT
            u.user_id,
            u.full_name,
            u.email,
            u.created_at,
            (
                SELECT COUNT(*)
                FROM enrollments e
                WHERE e.student_id = u.user_id
                ${courseId ? "AND e.course_id = ?" : ""}
            ) AS enrollment_count,
            (
                SELECT COALESCE(ROUND(AVG(p.completion_percentage), 1), 0)
                FROM progress p
                WHERE p.student_id = u.user_id
                ${courseId ? "AND p.course_id = ?" : ""}
            ) AS avg_progress,
            (
                SELECT COALESCE(SUM(p.total_study_time), 0)
                FROM progress p
                WHERE p.student_id = u.user_id
                ${courseId ? "AND p.course_id = ?" : ""}
            ) AS total_study_time,
            (
                SELECT MAX(l.log_date)
                FROM learning_logs l
                WHERE l.student_id = u.user_id
                ${courseId ? "AND l.course_id = ?" : ""}
            ) AS last_log_date
        FROM users u
        WHERE u.role = 'student'
    `;

    if (courseId) {
        params.push(courseId, courseId, courseId, courseId);
        sql += `
            AND EXISTS (
                SELECT 1 FROM enrollments e
                WHERE e.student_id = u.user_id AND e.course_id = ?
            )
        `;
        params.push(courseId);
    }

    if (status === "enrolled") {
        sql += `
            AND EXISTS (
                SELECT 1 FROM enrollments e WHERE e.student_id = u.user_id
            )
        `;
    } else if (status === "unenrolled") {
        sql += `
            AND NOT EXISTS (
                SELECT 1 FROM enrollments e WHERE e.student_id = u.user_id
            )
        `;
    }

    sql += " ORDER BY u.full_name ASC";

    db.query(sql, params, callback);
};


const getLecturerReportRows = (callback) => {
    const sql = `
        SELECT
            u.user_id,
            u.full_name,
            u.email,
            u.created_at,
            COUNT(DISTINCT c.course_id) AS courses_taught,
            COUNT(DISTINCT e.enrollment_id) AS total_students,
            COALESCE(ROUND(AVG(p.completion_percentage), 1), 0) AS avg_student_progress
        FROM users u
        LEFT JOIN courses c ON c.lecturer_id = u.user_id
        LEFT JOIN enrollments e ON e.course_id = c.course_id
        LEFT JOIN progress p ON p.course_id = c.course_id
        WHERE u.role = 'lecturer'
        GROUP BY u.user_id, u.full_name, u.email, u.created_at
        ORDER BY u.full_name ASC
    `;

    db.query(sql, callback);
};


const getStudentReportDetail = (studentId, callback) => {
    const profileSql = `
        SELECT user_id, full_name, email, role, created_at
        FROM users
        WHERE user_id = ? AND role = 'student'
    `;

    db.query(profileSql, [studentId], (err, users) => {
        if (err) {
            return callback(err);
        }

        if (users.length === 0) {
            return callback(null, null);
        }

        const enrollmentsSql = `
            SELECT
                e.enrollment_id,
                e.enrolled_at,
                c.course_id,
                c.course_code,
                c.course_title,
                u.full_name AS lecturer_name,
                COALESCE(p.completion_percentage, 0) AS completion_percentage,
                COALESCE(p.total_study_time, 0) AS total_study_time,
                (
                    SELECT MAX(l.log_date)
                    FROM learning_logs l
                    WHERE l.student_id = e.student_id
                    AND l.course_id = e.course_id
                ) AS last_log_date
            FROM enrollments e
            JOIN courses c ON c.course_id = e.course_id
            JOIN users u ON u.user_id = c.lecturer_id
            LEFT JOIN progress p
                ON p.student_id = e.student_id AND p.course_id = e.course_id
            WHERE e.student_id = ?
            ORDER BY e.enrolled_at DESC
        `;

        db.query(enrollmentsSql, [studentId], (enrollErr, enrollments) => {
            if (enrollErr) {
                return callback(enrollErr);
            }

            const logsSql = `
                SELECT
                    l.log_id,
                    l.topic,
                    l.study_duration,
                    l.log_date,
                    l.notes,
                    c.course_code,
                    c.course_title
                FROM learning_logs l
                JOIN courses c ON c.course_id = l.course_id
                WHERE l.student_id = ?
                ORDER BY l.log_date DESC, l.created_at DESC
                LIMIT 20
            `;

            db.query(logsSql, [studentId], (logsErr, logs) => {
                if (logsErr) {
                    return callback(logsErr);
                }

                callback(null, {
                    student: users[0],
                    enrollments,
                    recent_logs: logs
                });
            });
        });
    });
};


module.exports = {
    findUserByEmail,
    findUserById,
    createUser,
    updateUserProfile,
    updateUserPassword,
    getUsers,
    getUsersByCategory,
    getCategoryCounts,
    getReportUsers,
    getStudentReportRows,
    getLecturerReportRows,
    getStudentReportDetail
};
