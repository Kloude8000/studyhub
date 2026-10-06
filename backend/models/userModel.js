const db = require("../config/db");

// ===== Find user by email =====
const findUserByEmail = (email, callback) => {
    const sql = "SELECT * FROM users WHERE email = ?";
    db.query(sql, [email], callback);
};

// ===== Find user by student_id =====
const findUserByStudentId = (studentId, callback) => {
    const sql = "SELECT * FROM users WHERE student_id = ?";
    db.query(sql, [studentId], callback);
};

// ===== Find user by ID (excludes password) =====
const findUserById = (userId, callback) => {
    const sql = `
        SELECT user_id, full_name, email, student_id, role, created_at
        FROM users
        WHERE user_id = ?
    `;
    db.query(sql, [userId], callback);
};

// ===== Find user by ID including password hash (auth operations only) =====
const findUserByIdWithPassword = (userId, callback) => {
    const sql = `
        SELECT user_id, full_name, email, student_id, role, password_hash, created_at
        FROM users
        WHERE user_id = ?
    `;
    db.query(sql, [userId], callback);
};

// ===== Create a new user (student_id optional) =====
const createUser = (userData, callback) => {
    const sql = `
        INSERT INTO users 
        (full_name, email, student_id, password_hash, role)
        VALUES (?, ?, ?, ?, ?)
    `;
    db.query(
        sql,
        [
            userData.full_name,
            userData.email,
            userData.student_id || null,   // if not provided, set NULL
            userData.password_hash,
            userData.role
        ],
        callback
    );
};

// ===== Update user (name, email, password_hash) =====
const updateUser = (userId, updates, callback) => {
    const fields = [];
    const values = [];

    if (updates.full_name) {
        fields.push("full_name = ?");
        values.push(updates.full_name);
    }
    if (updates.email) {
        fields.push("email = ?");
        values.push(updates.email);
    }
    if (updates.password_hash) {
        fields.push("password_hash = ?");
        values.push(updates.password_hash);
    }

    if (fields.length === 0) {
        return callback(null, { affectedRows: 0 });
    }

    const sql = `UPDATE users SET ${fields.join(", ")} WHERE user_id = ?`;
    values.push(userId);
    db.query(sql, values, callback);
};

// ===== Get users by role (admin) =====
const getUsersByRole = (role, callback) => {
    const sql = `
        SELECT user_id, full_name, email, student_id, role, created_at
        FROM users
        WHERE role = ?
        ORDER BY full_name ASC
    `;
    db.query(sql, [role], callback);
};

// ===== Students with no enrollments (admin) =====
const getUnenrolledStudents = (callback) => {
    const sql = `
        SELECT u.user_id, u.full_name, u.email, u.student_id, u.created_at
        FROM users u
        WHERE u.role = 'student'
          AND u.user_id NOT IN (
              SELECT DISTINCT e.student_id FROM enrollments e
          )
        ORDER BY u.full_name ASC
    `;
    db.query(sql, callback);
};

// ===== Get all users (admin) =====
const getAllUsers = (callback) => {
    const sql = `
        SELECT user_id, full_name, email, student_id, role, created_at
        FROM users
        ORDER BY created_at DESC
    `;
    db.query(sql, callback);
};

// ===== User counts by role (admin stats) =====
const getUserCountsByRole = (callback) => {
    const sql = `
        SELECT role, COUNT(*) AS count
        FROM users
        GROUP BY role
    `;
    db.query(sql, callback);
};

const getAllUserIds = (callback) => {
    const sql = "SELECT user_id FROM users";
    db.query(sql, callback);
};

// ===== Delete user by ID (admin) =====
const deleteUserById = (userId, callback) => {
    const sql = `
        DELETE FROM users
        WHERE user_id = ?
    `;
    db.query(sql, [userId], callback);
};

module.exports = {
    findUserByEmail,
    findUserByStudentId,
    findUserById,
    findUserByIdWithPassword,
    createUser,
    updateUser,
    getAllUsers,
    getUsersByRole,
    getUnenrolledStudents,
    getUserCountsByRole,
    getAllUserIds,
    deleteUserById
};