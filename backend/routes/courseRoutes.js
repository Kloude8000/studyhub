const express = require("express");

const router = express.Router();

const courseController = require("../controllers/courseController");

const protect = require("../middleware/authMiddleware");

const authorizeRoles = require("../middleware/roleMiddleware");

const topicController = require("../controllers/topicController");

const {
    validateCourseCreation,
    validateTopic
} = require("../validations/courseValidation");


// ================= CREATE COURSE =================
router.post(
    "/create",
    protect,
    authorizeRoles("lecturer", "admin"),
    validateCourseCreation,
    courseController.createCourse
);

// ================= GET ALL COURSES =================
router.get("/", courseController.getAllCourses);



// ================= MY COURSES =================
router.get(
    "/my-courses",
    protect,
    authorizeRoles("lecturer", "admin"),
    courseController.getMyCourses
);



router.get(
    "/:id/topics",
    protect,
    topicController.listTopics
);

router.post(
    "/:id/topics",
    protect,
    authorizeRoles("lecturer", "admin"),
    validateTopic,
    topicController.addTopic
);

router.put(
    "/:id/topics/:topicId",
    protect,
    authorizeRoles("lecturer", "admin"),
    validateTopic,
    topicController.updateTopic
);

router.delete(
    "/:id/topics/:topicId",
    protect,
    authorizeRoles("lecturer", "admin"),
    topicController.deleteTopic
);



// ================= GET SINGLE COURSE =================
router.get("/:id", courseController.getCourseById);



// ================= UPDATE COURSE =================
router.put(
    "/:id",
    protect,
    authorizeRoles("lecturer", "admin"),
    validateCourseCreation,
    courseController.updateCourse
);



// ================= DELETE COURSE =================
router.delete(
    "/:id",
    protect,
    authorizeRoles("lecturer", "admin"),
    courseController.deleteCourse
);


module.exports = router;