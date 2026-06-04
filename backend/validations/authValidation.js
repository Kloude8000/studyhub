const { body, validationResult } = require("express-validator");


// ================= REGISTER VALIDATION =================
const validateRegister = [

    // Full name
    body("full_name")
        .trim()
        .notEmpty()
        .withMessage("Full name is required"),


    // Email
    body("email")
        .isEmail()
        .withMessage("Valid email is required")
        .normalizeEmail(),


    // Password
    body("password")
        .isLength({ min: 6 })
        .withMessage("Password must be at least 6 characters"),


    // Public registration is student-only; reject elevated roles
    body("role")
        .optional()
        .custom((value) => {
            if (value && value !== "student") {
                throw new Error(
                    "Only student accounts can be created via public registration"
                );
            }
            return true;
        }),


    // Final validation handler
    (req, res, next) => {

        const errors = validationResult(req);

        if (!errors.isEmpty()) {

            return res.status(400).json({
                errors: errors.array().map(error => error.msg)
            });

        }

        next();

    }

];



// ================= LOGIN VALIDATION =================
const validateLogin = [

    // Email
    body("email")
        .isEmail()
        .withMessage("Valid email is required"),


    // Password
    body("password")
        .notEmpty()
        .withMessage("Password is required"),


    // Final validation handler
    (req, res, next) => {

        const errors = validationResult(req);

        if (!errors.isEmpty()) {

            return res.status(400).json({
                errors: errors.array()
            });

        }

        next();

    }

];



// ================= CREATE LECTURER VALIDATION (ADMIN) =================
const validateCreateLecturer = [

    body("full_name")
        .trim()
        .notEmpty()
        .withMessage("Full name is required"),

    body("email")
        .isEmail()
        .withMessage("Valid email is required")
        .normalizeEmail(),

    body("password")
        .isLength({ min: 6 })
        .withMessage("Password must be at least 6 characters"),

    (req, res, next) => {

        const errors = validationResult(req);

        if (!errors.isEmpty()) {
            return res.status(400).json({
                errors: errors.array().map(error => error.msg)
            });
        }

        next();

    }

];



module.exports = {
    validateRegister,
    validateLogin,
    validateCreateLecturer
};