const { body, validationResult } = require("express-validator");

const validateUpdateProfile = [
    body("full_name")
        .optional()
        .trim()
        .notEmpty()
        .withMessage("Full name cannot be empty"),

    body("email")
        .optional()
        .isEmail()
        .withMessage("Valid email is required")
        .normalizeEmail(),

    body("current_password")
        .optional()
        .notEmpty()
        .withMessage("Current password cannot be empty"),

    body("new_password")
        .optional()
        .isLength({ min: 6 })
        .withMessage("New password must be at least 6 characters"),

    (req, res, next) => {
        const errors = validationResult(req);

        if (!errors.isEmpty()) {
            return res.status(400).json({
                errors: errors.array().map((error) => error.msg)
            });
        }

        next();
    }
];

module.exports = {
    validateUpdateProfile
};
