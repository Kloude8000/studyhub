const jwt = require("jsonwebtoken");

const protect = (req, res, next) => {

    let token;

    // Check if authorization header exists
    if (
        req.headers.authorization &&
        req.headers.authorization.startsWith("Bearer")
    ) {

        try {

            // Extract token
            token = req.headers.authorization.split(" ")[1];


            // Verify token
            const decoded = jwt.verify(
                token,
                process.env.JWT_SECRET
            );


            // Attach user data to request
            req.user = decoded;


            // Continue to next middleware/controller
            next();

        } catch (error) {

            return res.status(401).json({
                message: "Invalid token"
            });

        }

    }

    // No token provided
    if (!token) {
        return res.status(401).json({
            message: "No token provided"
        });
    }

};

module.exports = protect;