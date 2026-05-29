const express = require("express");

const router = express.Router();

const progressController = require("../controllers/progressController");

const protect = require("../middleware/authMiddleware");

const authorizeRoles = require("../middleware/roleMiddleware");

const {
    validateLearningLog
} = require("../validations/progressValidation");



// ================= ADD LEARNING LOG =================
router.post(
    "/log",
    protect,
    authorizeRoles("student"),
    validateLearningLog,
    progressController.addLearningLog
);



// ================= GET MY PROGRESS =================
router.get(
    "/my-progress",
    protect,
    authorizeRoles("student"),
    progressController.getMyProgress
);



// ================= GET COURSE PROGRESS =================
router.get(
    "/course/:courseId",
    protect,
    authorizeRoles("lecturer", "admin"),
    progressController.getCourseProgress
);


module.exports = router;