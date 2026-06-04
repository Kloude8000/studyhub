const authorizeRoles = (...allowedRoles) => {

    return (req, res, next) => {

        // Check if user's role is allowed
        if (!allowedRoles.includes(req.user.role)) {

            return res.status(403).json({
                message: "Access denied. Insufficient permissions."
            });

        }

        next();

    };

};

module.exports = authorizeRoles;