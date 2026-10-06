const bcrypt = require("bcryptjs");
const userModel = require("../models/userModel");
const generateToken = require("../utils/generateToken");
const { notifyLecturerWelcome } = require("../utils/notify");
const sendServerError = require("../utils/sendServerError");

// ================= REGISTER (student only) =================
const registerUser = async (req, res) => {
    try {
        const { full_name, email, student_id, password } = req.body;

        // Check email uniqueness
        userModel.findUserByEmail(email, async (err, results) => {
            if (err) return sendServerError(res, err, "Database error");
            if (results.length > 0) {
                return res.status(400).json({ message: "Email already exists" });
            }

            // Check student_id uniqueness (if provided)
            if (student_id) {
                userModel.findUserByStudentId(student_id, async (err, results) => {
                    if (err) return sendServerError(res, err, "Database error");
                    if (results.length > 0) {
                        return res.status(400).json({ message: "Student ID already in use" });
                    }
                    // proceed to create
                    createStudentUser(full_name, email, student_id, password, res);
                });
            } else {
                // No student_id provided – reject because it's required for students
                return res.status(400).json({ message: "Student ID is required" });
            }
        });
    } catch (error) {
        sendServerError(res, error, "Server error");
    }
};

// Helper function to create the student user
const createStudentUser = async (full_name, email, student_id, password, res) => {
    try {
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const newUser = {
            full_name,
            email,
            student_id,
            password_hash: hashedPassword,
            role: "student"
        };

        userModel.createUser(newUser, (createErr, result) => {
            if (createErr) return sendServerError(res, createErr, "Failed to create user");
            res.status(201).json({
                message: "Student registered successfully",
                userId: result.insertId
            });
        });
    } catch (error) {
        sendServerError(res, error, "Server error");
    }
};

// ================= LOGIN (email OR student_id) =================
const loginUser = (req, res) => {
    try {
        const { email, student_id, password } = req.body;

        if (!email && !student_id) {
            return res.status(400).json({ message: "Email or Student ID required" });
        }

        const handleLogin = (err, results) => {
            if (err) return sendServerError(res, err, "Database error");
            if (results.length === 0) {
                return res.status(401).json({ message: "Invalid credentials" });
            }

            const user = results[0];
            bcrypt.compare(password, user.password_hash, (err, isMatch) => {
                if (err) return sendServerError(res, err, "Error comparing passwords");
                if (!isMatch) {
                    return res.status(401).json({ message: "Invalid credentials" });
                }

                const token = generateToken(user);
                res.status(200).json({
                    message: "Login successful",
                    token,
                    user: {
                        user_id: user.user_id,
                        full_name: user.full_name,
                        email: user.email,
                        student_id: user.student_id,
                        role: user.role
                    }
                });
            });
        };

        if (email) {
            userModel.findUserByEmail(email, handleLogin);
        } else if (student_id) {
            userModel.findUserByStudentId(student_id, handleLogin);
        }
    } catch (error) {
        sendServerError(res, error, "Server error");
    }
};

// ================= CREATE LECTURER (admin only) =================
const createLecturer = async (req, res) => {
    try {
        const { full_name, email, password } = req.body;

        userModel.findUserByEmail(email, async (err, results) => {
            if (err) return sendServerError(res, err, "Database error");
            if (results.length > 0) {
                return res.status(400).json({ message: "Email already exists" });
            }

            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(password, salt);

            const newUser = {
                full_name,
                email,
                student_id: null,            // lecturers do not have a student ID
                password_hash: hashedPassword,
                role: "lecturer"
            };

            userModel.createUser(newUser, (createErr, result) => {
                if (createErr) return sendServerError(res, createErr, "Failed to create lecturer");
                res.status(201).json({
                    message: "Lecturer created successfully",
                    userId: result.insertId
                });
                notifyLecturerWelcome(result.insertId);
            });
        });
    } catch (error) {
        sendServerError(res, error, "Server error");
    }
};

module.exports = {
    registerUser,
    loginUser,
    createLecturer
};