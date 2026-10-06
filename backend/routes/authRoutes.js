const express = require("express");
const protect = require("../middleware/authMiddleware");
const authorizeRoles = require("../middleware/roleMiddleware");

const router = express.Router();

const {
    registerUser,
    loginUser,
    createLecturer
} = require("../controllers/authController");

const {
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
} = require("../controllers/userController");

const {
    getLecturerReports,
    getLecturerReportById,
    exportLecturerReports,
    exportLecturerReportById,
    getStudentReports,
    getStudentReportById,
    exportStudentReports,
    exportStudentReportById
} = require("../controllers/reportController");

const {
    validateRegister,
    validateLogin,
    validateCreateLecturer,
    validateProfileUpdate          // NEW
} = require("../validations/authValidation");

// ===== PUBLIC ROUTES =====
router.post("/register", validateRegister, registerUser);
router.post("/login", validateLogin, loginUser);

// ===== PROTECTED ROUTES =====
router.get("/profile", protect, getProfile);
router.put("/profile", protect, validateProfileUpdate, updateProfile);

// ===== ADMIN ONLY =====
router.get(
    "/users",
    protect,
    authorizeRoles("admin"),
    getAllUsers
);

router.get(
    "/users/grouped",
    protect,
    authorizeRoles("admin"),
    getUsersGrouped
);

router.get(
    "/users/lecturers",
    protect,
    authorizeRoles("admin"),
    getLecturers
);

router.get(
    "/users/unenrolled-students",
    protect,
    authorizeRoles("admin"),
    getUnenrolledStudentsList
);

router.get(
    "/users/admins",
    protect,
    authorizeRoles("admin"),
    getAdmins
);

router.get(
    "/users/course-options",
    protect,
    authorizeRoles("admin"),
    getUserManagementCourseOptions
);

router.get(
    "/admin/stats",
    protect,
    authorizeRoles("admin"),
    getAdminStats
);

router.get(
    "/admin/reports/lecturers/export",
    protect,
    authorizeRoles("admin"),
    exportLecturerReports
);

router.get(
    "/admin/reports/lecturers/:userId/export",
    protect,
    authorizeRoles("admin"),
    exportLecturerReportById
);

router.get(
    "/admin/reports/lecturers/:userId",
    protect,
    authorizeRoles("admin"),
    getLecturerReportById
);

router.get(
    "/admin/reports/lecturers",
    protect,
    authorizeRoles("admin"),
    getLecturerReports
);

router.get(
    "/admin/reports/students/export",
    protect,
    authorizeRoles("admin"),
    exportStudentReports
);

router.get(
    "/admin/reports/students/:userId/export",
    protect,
    authorizeRoles("admin"),
    exportStudentReportById
);

router.get(
    "/admin/reports/students/:userId",
    protect,
    authorizeRoles("admin"),
    getStudentReportById
);

router.get(
    "/admin/reports/students",
    protect,
    authorizeRoles("admin"),
    getStudentReports
);

router.post(
    "/users/lecturer",
    protect,
    authorizeRoles("admin"),
    validateCreateLecturer,
    createLecturer
);

router.delete(
    "/users/:userId",
    protect,
    authorizeRoles("admin"),
    deleteUser
);

module.exports = router;