const { body, validationResult } = require("express-validator");



const validateLearningLog = [

    body("course_id")
        .notEmpty()
        .withMessage("Course ID is required"),


    body("topic")
        .trim()
        .notEmpty()
        .withMessage("Topic is required"),


    body("study_duration")
        .isInt({ min: 1 })
        .withMessage("Study duration must be a positive integer"),


    body("log_date")
        .notEmpty()
        .withMessage("Log date is required"),


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
    validateLearningLog,
    validateLearningLogUpdate: [

        body("topic")
            .trim()
            .notEmpty()
            .withMessage("Topic is required"),

        body("study_duration")
            .isInt({ min: 1 })
            .withMessage("Study duration must be a positive integer"),

        body("log_date")
            .notEmpty()
            .withMessage("Log date is required"),

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

    ]
};