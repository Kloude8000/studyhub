const { body, validationResult } = require("express-validator");


// ================= CREATE COURSE VALIDATION =================
const validateCourseCreation = [

    body("course_code")
        .trim()
        .notEmpty()
        .withMessage("Course code is required"),


    body("course_title")
        .trim()
        .notEmpty()
        .withMessage("Course title is required"),


    body("description")
        .optional()
        .trim(),


    body("lecturer_id")
        .optional()
        .isInt({ min: 1 })
        .withMessage("Invalid lecturer ID"),


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


const validateTopic = [

    body("title")
        .trim()
        .notEmpty()
        .withMessage("Topic title is required"),

    body("sort_order")
        .optional({ nullable: true, checkFalsy: true })
        .isInt({ min: 0 })
        .withMessage("Sort order must be a non-negative integer"),

    (req, res, next) => {

        const errors = validationResult(req);

        if (!errors.isEmpty()) {

            return res.status(400).json({
                errors: errors.array().map(
                    error => error.msg
                )
            });

        }

        next();

    }

];


const validateAnnouncement = [

    body("title")
        .trim()
        .notEmpty()
        .withMessage("Announcement title is required"),

    body("body")
        .optional({ nullable: true })
        .trim(),

    (req, res, next) => {

        const errors = validationResult(req);

        if (!errors.isEmpty()) {

            return res.status(400).json({
                errors: errors.array().map(
                    error => error.msg
                )
            });

        }

        next();

    }

];


module.exports = {
    validateCourseCreation,
    validateTopic,
    validateAnnouncement
};