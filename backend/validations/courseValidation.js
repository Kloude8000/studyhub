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


module.exports = {
    validateCourseCreation
};