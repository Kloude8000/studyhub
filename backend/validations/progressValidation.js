const { body, validationResult } = require("express-validator");


const handleValidation = (req, res, next) => {

    const errors = validationResult(req);

    if (!errors.isEmpty()) {

        return res.status(400).json({
            errors: errors.array().map(
                error => error.msg
            )
        });

    }

    next();

};


const validateLearningLog = [

    body("course_id")
        .notEmpty()
        .withMessage("Course ID is required")
        .isInt({ min: 1 })
        .withMessage("Course ID must be a positive integer"),

    body("topic_id")
        .notEmpty()
        .withMessage("Topic is required")
        .isInt({ min: 1 })
        .withMessage("Topic ID must be a positive integer"),

    body("study_duration")
        .isInt({ min: 1, max: 240 })
        .withMessage("Study duration must be between 1 and 240 minutes"),

    body("log_date")
        .notEmpty()
        .withMessage("Log date is required"),

    handleValidation

];


const validateLearningLogUpdate = [

    body("study_duration")
        .isInt({ min: 1, max: 240 })
        .withMessage("Study duration must be between 1 and 240 minutes"),

    body("log_date")
        .notEmpty()
        .withMessage("Log date is required"),

    handleValidation

];


module.exports = {
    validateLearningLog,
    validateLearningLogUpdate
};
