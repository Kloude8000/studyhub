const bcrypt = require("bcryptjs");
const userModel = require("../models/userModel");
const generateToken = require("../utils/generateToken");
const sendServerError = require("../utils/sendServerError");


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


const getProfile = (req, res) => {

    userModel.findUserById(req.user.userId, (err, results) => {

        if (err) {
            return sendServerError(res, err, "Error fetching profile");
        }

        if (results.length === 0) {
            return res.status(404).json({
                message: "User not found"
            });
        }

        res.json({
            user: results[0]
        });

    });

};


const updateProfile = async (req, res) => {

    try {

        const userId = req.user.userId;
        const { full_name, email, current_password, new_password } = req.body;

        userModel.findUserById(userId, async (err, results) => {

            if (err) {
                return sendServerError(res, err, "Error fetching profile");
            }

            if (results.length === 0) {
                return res.status(404).json({
                    message: "User not found"
                });
            }

            const currentUser = results[0];
            const nextName = full_name ?? currentUser.full_name;
            const nextEmail = email ?? currentUser.email;

            const respondWithUser = () => {
                userModel.findUserById(userId, (fetchErr, updatedResults) => {

                    if (fetchErr) {
                        return sendServerError(res, fetchErr, "Error fetching profile");
                    }

                    const updatedUser = updatedResults[0];
                    const token = generateToken({
                        user_id: updatedUser.user_id,
                        email: updatedUser.email,
                        role: updatedUser.role
                    });

                    res.json({
                        message: "Profile updated successfully",
                        token,
                        user: updatedUser
                    });

                });
            };

            const saveProfile = (onSuccess = respondWithUser) => {
                userModel.updateUserProfile(
                    userId,
                    { full_name: nextName, email: nextEmail },
                    (profileErr) => {

                        if (profileErr) {
                            return sendServerError(res, profileErr, "Failed to update profile");
                        }

                        onSuccess();

                    }
                );
            };

            const ensureEmailAvailable = (onAvailable) => {

                if (nextEmail === currentUser.email) {
                    return onAvailable();
                }

                return userModel.findUserByEmail(nextEmail, (emailErr, emailResults) => {

                    if (emailErr) {
                        return sendServerError(res, emailErr, "Database error");
                    }

                    if (
                        emailResults.length > 0
                        && Number(emailResults[0].user_id) !== Number(userId)
                    ) {
                        return res.status(400).json({
                            message: "Email already exists"
                        });
                    }

                    onAvailable();

                });

            };

            if (new_password) {
                userModel.findUserByEmail(currentUser.email, async (lookupErr, lookupResults) => {

                    if (lookupErr) {
                        return sendServerError(res, lookupErr, "Database error");
                    }

                    const isMatch = await bcrypt.compare(
                        current_password || "",
                        lookupResults[0].password_hash
                    );

                    if (!isMatch) {
                        return res.status(400).json({
                            message: "Current password is incorrect"
                        });
                    }

                    const salt = await bcrypt.genSalt(10);
                    const hashedPassword = await bcrypt.hash(new_password, salt);

                    ensureEmailAvailable(() => {
                        saveProfile(() => {
                            userModel.updateUserPassword(
                                userId,
                                hashedPassword,
                                (passwordErr) => {

                                    if (passwordErr) {
                                        return sendServerError(
                                            res,
                                            passwordErr,
                                            "Failed to update password"
                                        );
                                    }

                                    respondWithUser();

                                }
                            );
                        });
                    });

                });

                return;
            }

            if (current_password) {
                return res.status(400).json({
                    message: "New password is required when current password is provided"
                });
            }

            ensureEmailAvailable(() => saveProfile());

        });

    } catch (error) {
        sendServerError(res, error, "Server error");
    }

};


module.exports = {
    registerUser,
    loginUser,
    createLecturer,
    getProfile,
    updateProfile
};
