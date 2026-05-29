const bcrypt = require("bcryptjs");
const userModel = require("../models/userModel");
const generateToken = require("../utils/generateToken");


// ================= REGISTER =================
const registerUser = async (req, res) => {

    try {

        const {
            full_name,
            email,
            password,
            role
        } = req.body;


        // Check if user already exists
        userModel.findUserByEmail(email, async (err, results) => {

            if (err) {
                return res.status(500).json({
                    message: "Database error",
                    error: err
                });
            }

            if (results.length > 0) {
                return res.status(400).json({
                    message: "Email already exists"
                });
            }


            // Hash password
            const salt = await bcrypt.genSalt(10);

            const hashedPassword = await bcrypt.hash(password, salt);


            // Create user object
            const newUser = {
                full_name,
                email,
                password_hash: hashedPassword,
                role: role || "student"
            };


            // Save user
            userModel.createUser(newUser, (err, result) => {

                if (err) {
                    return res.status(500).json({
                        message: "Failed to create user",
                        error: err
                    });
                }

                res.status(201).json({
                    message: "User registered successfully",
                    userId: result.insertId
                });

            });

        });

    } catch (error) {

        res.status(500).json({
            message: "Server error",
            error
        });

    }

};



// ================= LOGIN =================
const loginUser = (req, res) => {

    try {

        const { email, password } = req.body;


        // Find user
        userModel.findUserByEmail(email, async (err, results) => {

            if (err) {
                return res.status(500).json({
                    message: "Database error",
                    error: err
                });
            }

            // User not found
            if (results.length === 0) {
                return res.status(401).json({
                    message: "Invalid email or password"
                });
            }


            const user = results[0];


            // Compare password
            const isMatch = await bcrypt.compare(
                password,
                user.password_hash
            );


            if (!isMatch) {
                return res.status(401).json({
                    message: "Invalid email or password"
                });
            }


            // Generate token
            const token = generateToken(user);


            // Success response
            res.status(200).json({

                message: "Login successful",

                token,

                user: {
                    user_id: user.user_id,
                    full_name: user.full_name,
                    email: user.email,
                    role: user.role
                }

            });

        });

    } catch (error) {

        res.status(500).json({
            message: "Server error",
            error
        });

    }

};


module.exports = {
    registerUser,
    loginUser
};