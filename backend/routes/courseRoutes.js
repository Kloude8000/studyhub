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


module.exports = router;