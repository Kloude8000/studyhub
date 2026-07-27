const express = require("express");

const router = express.Router();

const progressController = require("../controllers/progressController");

const protect = require("../middleware/authMiddleware");

const authorizeRoles = require("../middleware/roleMiddleware");

const {
    validateLearningLog,
    validateLearningLogUpdate
} = require("../validations/progressValidation");



// ================= ADD LEARNING LOG =================
router.post(
    "/log",
    protect,
    authorizeRoles("student"),
    validateLearningLog,
    progressController.addLearningLog
);



// ================= UPDATE LEARNING LOG =================
router.put(
    "/log/:logId",
    protect,
    authorizeRoles("student"),
    validateLearningLogUpdate,
    progressController.updateLearningLog
);



router.delete(
    "/log/:logId",
    protect,
    authorizeRoles("student"),
    progressController.deleteLearningLog
);



// ================= GET MY PROGRESS =================
router.get(
    "/my-progress",
    protect,
    authorizeRoles("student"),
    progressController.getMyProgress
);



// ================= GET MY LEARNING LOGS (JOURNAL) =================
router.get(
    "/logs",
    protect,
    authorizeRoles("student"),
    progressController.getMyLearningLogs
);



// ================= GET MY LEARNING LOGS BY COURSE =================
router.get(
    "/logs/course/:courseId",
    protect,
    authorizeRoles("student"),
    progressController.getMyLearningLogsByCourse
);



// ================= GET COURSE PROGRESS EXPORT =================
router.get(
    "/course/:courseId/export",
    protect,
    authorizeRoles("lecturer", "admin"),
    progressController.exportCourseProgress
);



// ================= GET COURSE PROGRESS =================
router.get(
    "/course/:courseId",
    protect,
    authorizeRoles("lecturer", "admin"),
    progressController.getCourseProgress
);


module.exports = router;