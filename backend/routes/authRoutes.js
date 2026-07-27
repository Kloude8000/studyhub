const express = require("express");

const router = express.Router();

const {
    registerUser,
    loginUser,
    createLecturer,
    getProfile,
    updateProfile
} = require("../controllers/authController");

const protect = require("../middleware/authMiddleware");

const authorizeRoles = require("../middleware/roleMiddleware");

const {
    validateRegister,
    validateLogin,
    validateCreateLecturer
} = require("../validations/authValidation");

const { validateUpdateProfile } = require("../validations/profileValidation");


router.post(
    "/register",
    validateRegister,
    registerUser
);


router.post(
    "/login",
    validateLogin,
    loginUser
);


router.post(
    "/users/lecturer",
    protect,
    authorizeRoles("admin"),
    validateCreateLecturer,
    createLecturer
);


router.get("/profile", protect, getProfile);

router.put(
    "/profile",
    protect,
    validateUpdateProfile,
    updateProfile
);


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
