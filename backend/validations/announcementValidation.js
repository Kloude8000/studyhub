const { body, validationResult } = require("express-validator");

const validateAnnouncement = [
    body("title")
        .trim()
        .notEmpty()
        .withMessage("Title is required"),

    body("body")
        .trim()
        .notEmpty()
        .withMessage("Announcement body is required"),

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
    validateAnnouncement
};
