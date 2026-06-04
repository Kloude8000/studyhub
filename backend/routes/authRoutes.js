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
    validateRegister,
    validateLogin,
    validateCreateLecturer
} = require("../validations/authValidation");


// Register
router.post(
    "/register",
    validateRegister,
    registerUser
);


// Login
router.post(
    "/login",
    validateLogin,
    loginUser
);


// Create lecturer (admin only)
router.post(
    "/users/lecturer",
    protect,
    authorizeRoles("admin"),
    validateCreateLecturer,
    createLecturer
);


router.get("/profile", protect, (req, res) => {

    res.status(200).json({
        message: "Protected profile route accessed",
        user: req.user
    });

});

// Lecturer only route
router.get(
    "/lecturer-dashboard",
    protect,
    authorizeRoles("lecturer"),
    (req, res) => {

        res.status(200).json({
            message: "Welcome Lecturer"
        });

    }
);


// Admin only route
router.get(
    "/admin-dashboard",
    protect,
    authorizeRoles("admin"),
    (req, res) => {

        res.status(200).json({
            message: "Welcome Admin"
        });

    }
);


// Lecturer or Admin
router.get(
    "/manage-courses",
    protect,
    authorizeRoles("lecturer", "admin"),
    (req, res) => {

        res.status(200).json({
            message: "Course management access granted"
        });

    }
);


module.exports = router;