const express = require("express");

const router = express.Router();

const courseController = require("../controllers/courseController");

const protect = require("../middleware/authMiddleware");

const authorizeRoles = require("../middleware/roleMiddleware");

const {
    validateCourseCreation
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
    "/lecturers/list",
    protect,
    authorizeRoles("admin"),
    courseController.getLecturers
);



// ================= GET SINGLE COURSE =================
router.get("/:id", courseController.getCourseById);



// ================= UPDATE COURSE =================
router.put(
    "/:id",
    protect,
    authorizeRoles("lecturer", "admin"),
    courseController.updateCourse
);



// ================= DELETE COURSE =================
router.delete(
    "/:id",
    protect,
    authorizeRoles("lecturer", "admin"),
    courseController.deleteCourse
);



router.patch(
    "/:id/lecturer",
    protect,
    authorizeRoles("admin"),
    courseController.reassignLecturer
);


module.exports = router;