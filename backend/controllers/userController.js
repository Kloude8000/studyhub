const bcrypt = require("bcryptjs");
const userModel = require("../models/userModel");
const courseModel = require("../models/courseModel");
const enrollmentModel = require("../models/enrollmentModel");
const sendServerError = require("../utils/sendServerError");

// ================= GET PROFILE =================
const getProfile = (req, res) => {
    const userId = req.user.userId;

    userModel.findUserById(userId, (err, results) => {
        if (err) return sendServerError(res, err, "Database error");
        if (results.length === 0) {
            return res.status(404).json({ message: "User not found" });
        }
        res.status(200).json({ user: results[0] });
    });
};

// ================= UPDATE PROFILE =================
const updateProfile = async (req, res) => {
    const userId = req.user.userId;
    const { full_name, email, current_password, new_password } = req.body;

    const fetchUser = (current_password && new_password)
        ? userModel.findUserByIdWithPassword
        : userModel.findUserById;

    fetchUser(userId, async (err, results) => {
        if (err) return sendServerError(res, err, "Database error");
        if (results.length === 0) {
            return res.status(404).json({ message: "User not found" });
        }

        const user = results[0];
        const updates = {};

        // Helper to finalize update after optional email uniqueness check
        const proceedWithUpdate = () => {
            if (full_name) updates.full_name = full_name;

            // Handle password change
            if (current_password && new_password) {
                bcrypt.compare(current_password, user.password_hash, async (err, isMatch) => {
                    if (err) return sendServerError(res, err, "Error comparing passwords");
                    if (!isMatch) {
                        return res.status(400).json({ message: "Current password is incorrect" });
                    }
                    const salt = await bcrypt.genSalt(10);
                    updates.password_hash = await bcrypt.hash(new_password, salt);
                    // Now update
                    userModel.updateUser(userId, updates, (err, result) => {
                        if (err) return sendServerError(res, err, "Failed to update profile");
                        res.status(200).json({ message: "Profile updated successfully" });
                    });
                });
            } else {
                // No password change, just update name/email
                userModel.updateUser(userId, updates, (err, result) => {
                    if (err) return sendServerError(res, err, "Failed to update profile");
                    res.status(200).json({ message: "Profile updated successfully" });
                });
            }
        };

        // If email is being changed, check uniqueness
        if (email && email !== user.email) {
            userModel.findUserByEmail(email, (err, results) => {
                if (err) return sendServerError(res, err, "Database error");
                if (results.length > 0) {
                    return res.status(400).json({ message: "Email already in use" });
                }
                updates.email = email;
                proceedWithUpdate();
            });
        } else {
            // No email change (or same as before)
            if (email) updates.email = email;  // could be same, harmless
            proceedWithUpdate();
        }
    });
};

// ================= GET ALL USERS (admin) =================
const getAllUsers = (req, res) => {
    userModel.getAllUsers((err, results) => {
        if (err) return sendServerError(res, err, "Error fetching users");
        res.json(results);
    });
};

// ================= GET ADMIN STATS =================
const getAdminStats = (req, res) => {
    userModel.getUserCountsByRole((userErr, roleCounts) => {
        if (userErr) return sendServerError(res, userErr, "Error fetching user stats");

        courseModel.getAllCourses((courseErr, courses) => {
            if (courseErr) return sendServerError(res, courseErr, "Error fetching course stats");

            enrollmentModel.getTotalEnrollmentCount((enrollErr, enrollResults) => {
                if (enrollErr) return sendServerError(res, enrollErr, "Error fetching enrollment stats");

                const users = { total: 0, student: 0, lecturer: 0, admin: 0 };
                roleCounts.forEach((row) => {
                    users[row.role] = row.count;
                    users.total += row.count;
                });

                res.json({
                    users,
                    courses: courses.length,
                    enrollments: enrollResults[0]?.total || 0
                });
            });
        });
    });
};

// ================= DELETE USER (admin) =================
const deleteUser = (req, res) => {
    const adminId = req.user.userId;
    const { userId } = req.params;

    if (Number(userId) === Number(adminId)) {
        return res.status(400).json({
            message: "You cannot delete your own account"
        });
    }

    userModel.findUserById(userId, (err, results) => {
        if (err) return sendServerError(res, err, "Database error");
        if (results.length === 0) {
            return res.status(404).json({ message: "User not found" });
        }

        const targetUser = results[0];

        const performDelete = () => {
            userModel.deleteUserById(userId, (deleteErr, result) => {
                if (deleteErr) {
                    return sendServerError(res, deleteErr, "Failed to delete user");
                }
                if (result.affectedRows === 0) {
                    return res.status(404).json({ message: "User not found" });
                }
                res.json({ message: "User deleted successfully" });
            });
        };

        if (targetUser.role !== "admin") {
            return performDelete();
        }

        userModel.getUserCountsByRole((countErr, roleCounts) => {
            if (countErr) return sendServerError(res, countErr, "Database error");

            const adminCount = roleCounts.find((row) => row.role === "admin")?.count || 0;
            if (adminCount <= 1) {
                return res.status(400).json({
                    message: "Cannot delete the last admin account"
                });
            }

            performDelete();
        });
    });
};

// ================= GET LECTURERS (admin) =================
const getLecturers = (req, res) => {
    userModel.getUsersByRole("lecturer", (userErr, lecturers) => {
        if (userErr) return sendServerError(res, userErr, "Error fetching lecturers");

        courseModel.getAllCourses((courseErr, courses) => {
            if (courseErr) return sendServerError(res, courseErr, "Error fetching courses");

            const result = lecturers.map((lecturer) => ({
                ...lecturer,
                courses: courses
                    .filter((c) => Number(c.lecturer_id) === Number(lecturer.user_id))
                    .map((c) => ({
                        course_id: c.course_id,
                        course_code: c.course_code,
                        course_title: c.course_title
                    }))
            }));

            res.json(result);
        });
    });
};

// ================= GET UNENROLLED STUDENTS (admin) =================
const getUnenrolledStudentsList = (req, res) => {
    userModel.getUnenrolledStudents((err, results) => {
        if (err) return sendServerError(res, err, "Error fetching unenrolled students");
        res.json(results);
    });
};

// ================= GET ADMINS (admin) =================
const getAdmins = (req, res) => {
    userModel.getUsersByRole("admin", (err, results) => {
        if (err) return sendServerError(res, err, "Error fetching administrators");
        res.json(results);
    });
};

// ================= GET COURSE OPTIONS FOR USER MANAGEMENT (admin) =================
const getUserManagementCourseOptions = (req, res) => {
    courseModel.getCoursesWithStudentCounts((err, results) => {
        if (err) return sendServerError(res, err, "Error fetching courses");
        res.json(results);
    });
};

// ================= GET GROUPED USERS (admin) =================
const getUsersGrouped = (req, res) => {
    userModel.getAllUsers((userErr, users) => {
        if (userErr) return sendServerError(res, userErr, "Error fetching users");

        courseModel.getAllCourses((courseErr, courses) => {
            if (courseErr) return sendServerError(res, courseErr, "Error fetching courses");

            enrollmentModel.getAllEnrollmentsDetailed((enrollErr, enrollments) => {
                if (enrollErr) return sendServerError(res, enrollErr, "Error fetching enrollments");

                const lecturers = users
                    .filter((u) => u.role === "lecturer")
                    .map((lecturer) => ({
                        ...lecturer,
                        courses: courses
                            .filter((c) => Number(c.lecturer_id) === Number(lecturer.user_id))
                            .map((c) => ({
                                course_id: c.course_id,
                                course_code: c.course_code,
                                course_title: c.course_title
                            }))
                    }));

                const admins = users.filter((u) => u.role === "admin");

                const students = users.filter((u) => u.role === "student");
                const enrolledStudentIds = new Set(
                    enrollments.map((e) => Number(e.user_id))
                );
                const unenrolledStudents = students.filter(
                    (s) => !enrolledStudentIds.has(Number(s.user_id))
                );

                const coursesWithStudents = courses
                    .map((course) => ({
                        course_id: course.course_id,
                        course_code: course.course_code,
                        course_title: course.course_title,
                        lecturer_name: course.lecturer_name,
                        students: enrollments
                            .filter((e) => Number(e.course_id) === Number(course.course_id))
                            .map((e) => ({
                                user_id: e.user_id,
                                full_name: e.full_name,
                                email: e.email,
                                student_id: e.student_id,
                                enrolled_at: e.enrolled_at
                            }))
                    }))
                    .filter((course) => course.students.length > 0);

                res.json({
                    lecturers,
                    admins,
                    coursesWithStudents,
                    unenrolledStudents
                });
            });
        });
    });
};

module.exports = {
    getProfile,
    updateProfile,
    getAllUsers,
    getAdminStats,
    deleteUser,
    getLecturers,
    getUnenrolledStudentsList,
    getAdmins,
    getUserManagementCourseOptions,
    getUsersGrouped
};