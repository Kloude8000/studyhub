const bcrypt = require("bcryptjs");
const userModel = require("../models/userModel");
const generateToken = require("../utils/generateToken");
const sendServerError = require("../utils/sendServerError");


// ================= REGISTER =================
const registerUser = async (req, res) => {

    try {

        const {
            full_name,
            email,
            password
        } = req.body;


        userModel.findUserByEmail(email, async (err, results) => {

            if (err) {
                return sendServerError(res, err, "Database error");
            }

            if (results.length > 0) {
                return res.status(400).json({
                    message: "Email already exists"
                });
            }


            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(password, salt);


            const newUser = {
                full_name,
                email,
                password_hash: hashedPassword,
                role: "student"
            };


            userModel.createUser(newUser, (createErr, result) => {

                if (createErr) {
                    return sendServerError(res, createErr, "Failed to create user");
                }

                res.status(201).json({
                    message: "User registered successfully",
                    userId: result.insertId
                });

            });

        });

    } catch (error) {
        sendServerError(res, error, "Server error");
    }

};



// ================= LOGIN =================
const loginUser = (req, res) => {

    try {

        const { email, password } = req.body;


        userModel.findUserByEmail(email, async (err, results) => {

            if (err) {
                return sendServerError(res, err, "Database error");
            }

            if (results.length === 0) {
                return res.status(401).json({
                    message: "Invalid email or password"
                });
            }


            const user = results[0];

            const isMatch = await bcrypt.compare(
                password,
                user.password_hash
            );


            if (!isMatch) {
                return res.status(401).json({
                    message: "Invalid email or password"
                });
            }


            const token = generateToken(user);

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
        sendServerError(res, error, "Server error");
    }

};



// ================= CREATE LECTURER (ADMIN) =================
const createLecturer = async (req, res) => {

    try {

        const {
            full_name,
            email,
            password
        } = req.body;


        userModel.findUserByEmail(email, async (err, results) => {

            if (err) {
                return sendServerError(res, err, "Database error");
            }

            if (results.length > 0) {
                return res.status(400).json({
                    message: "Email already exists"
                });
            }


            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(password, salt);


            const newUser = {
                full_name,
                email,
                password_hash: hashedPassword,
                role: "lecturer"
            };


            userModel.createUser(newUser, (createErr, result) => {

                if (createErr) {
                    return sendServerError(res, createErr, "Failed to create lecturer");
                }

                res.status(201).json({
                    message: "Lecturer created successfully",
                    userId: result.insertId
                });

            });

        });

    } catch (error) {
        sendServerError(res, error, "Server error");
    }

};


module.exports = {
    registerUser,
    loginUser,
    createLecturer
};
