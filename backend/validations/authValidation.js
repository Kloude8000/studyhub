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


    // Role
    body("role")
        .optional()
        .isIn(["student", "lecturer", "admin"])
        .withMessage("Invalid role"),


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


module.exports = {
    validateRegister,
    validateLogin
};