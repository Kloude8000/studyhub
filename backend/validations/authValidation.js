const { body, validationResult } = require('express-validator');

// ===== REGISTER VALIDATION =====
const validateRegister = [
    body('full_name').notEmpty().withMessage('Full name is required'),
    body('email').isEmail().withMessage('Valid email required'),
    body('student_id')
        .notEmpty().withMessage('Student ID is required')
        .isLength({ min: 5, max: 50 }).withMessage('Student ID must be between 5 and 50 characters'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        next();
    }
];

// ===== LOGIN VALIDATION =====
const validateLogin = [
    body('email').optional().isEmail().withMessage('Valid email required'),
    body('student_id').optional().isLength({ min: 5, max: 50 }).withMessage('Invalid student ID'),
    body('password').notEmpty().withMessage('Password required'),
    (req, res, next) => {
        if (!req.body.email && !req.body.student_id) {
            return res.status(400).json({ message: 'Email or Student ID required' });
        }
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        next();
    }
];

// ===== CREATE LECTURER VALIDATION (admin) =====
const validateCreateLecturer = [
    body('full_name').notEmpty().withMessage('Full name is required'),
    body('email').isEmail().withMessage('Valid email required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        next();
    }
];

// ===== PROFILE UPDATE VALIDATION =====
const validateProfileUpdate = [
    body('full_name').optional().notEmpty().withMessage('Name cannot be empty'),
    body('email').optional().isEmail().withMessage('Valid email required'),
    body('current_password').optional(),
    body('new_password')
        .optional()
        .isLength({ min: 6 }).withMessage('New password must be at least 6 characters')
        .custom((value, { req }) => {
            if (req.body.current_password && !value) {
                throw new Error('New password is required when changing password');
            }
            return true;
        }),
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        next();
    }
];

module.exports = {
    validateRegister,
    validateLogin,
    validateCreateLecturer,
    validateProfileUpdate
};