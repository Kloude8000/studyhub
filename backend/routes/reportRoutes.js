const express = require("express");

const router = express.Router();
const reportController = require("../controllers/reportController");
const protect = require("../middleware/authMiddleware");
const authorizeRoles = require("../middleware/roleMiddleware");

router.get(
    "/users/counts",
    protect,
    authorizeRoles("admin"),
    reportController.getUserCategoryCounts
);

router.get(
    "/users",
    protect,
    authorizeRoles("admin"),
    reportController.listUsers
);

router.get(
    "/users/export",
    protect,
    authorizeRoles("admin"),
    reportController.exportUsersReport
);

router.get(
    "/students",
    protect,
    authorizeRoles("admin"),
    reportController.listStudentReports
);

router.get(
    "/students/export",
    protect,
    authorizeRoles("admin"),
    reportController.exportStudentReports
);

router.get(
    "/students/:studentId",
    protect,
    authorizeRoles("admin"),
    reportController.getStudentReportDetail
);

router.get(
    "/lecturers",
    protect,
    authorizeRoles("admin"),
    reportController.listLecturerReports
);

router.get(
    "/lecturers/export",
    protect,
    authorizeRoles("admin"),
    reportController.exportLecturerReports
);

module.exports = router;
