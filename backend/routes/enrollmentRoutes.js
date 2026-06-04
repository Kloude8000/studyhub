const express = require("express");

const router = express.Router();

const enrollmentController = require("../controllers/enrollmentController");

const protect = require("../middleware/authMiddleware");

const authorizeRoles = require("../middleware/roleMiddleware");



// ================= ENROLL IN COURSE =================
router.post(
    "/enroll/:courseId",
    protect,
    authorizeRoles("student"),
    enrollmentController.enrollInCourse
);



// ================= MY ENROLLMENTS =================
router.get(
    "/my-enrollments",
    protect,
    authorizeRoles("student"),
    enrollmentController.getMyEnrollments
);



// ================= COURSE ENROLLMENTS =================
router.get(
    "/course/:courseId",
    protect,
    authorizeRoles("lecturer", "admin"),
    enrollmentController.getCourseEnrollments
);


module.exports = router;