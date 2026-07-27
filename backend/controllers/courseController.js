const courseModel = require("../models/courseModel");
const userModel = require("../models/userModel");
const sendServerError = require("../utils/sendServerError");



// ================= CREATE COURSE =================
const createCourse = (req, res) => {

    const lecturer_id = req.user.userId;

    const {
        course_code,
        course_title,
        description,
        completion_target_minutes
    } = req.body;

    courseModel.createCourse({
        course_code,
        course_title,
        description,
        lecturer_id,
        completion_target_minutes
    }, (err, result) => {

        if (err) {
            return sendServerError(res, err, "Error creating course");
        }

        res.status(201).json({
            message: "Course created successfully",
            course_id: result.insertId
        });

    });

};



// ================= GET ALL COURSES =================
const getAllCourses = (req, res) => {

    courseModel.getAllCourses((err, results) => {

        if (err) {
            return sendServerError(res, err, "Error fetching courses");
        }

        res.json(results);

    });

};



// ================= GET SINGLE COURSE =================
const getCourseById = (req, res) => {

    const { id } = req.params;

    courseModel.getCourseById(id, (err, results) => {

        if (err) {
            return sendServerError(res, err, "Error fetching course");
        }

        if (results.length === 0) {
            return res.status(404).json({
                message: "Course not found"
            });
        }

        res.json(results[0]);

    });

};



// ================= LECTURER COURSES =================
const getMyCourses = (req, res) => {

    const { userId, role } = req.user;

    const fetchCourses = role === "admin"
        ? courseModel.getAllCourses
        : (callback) => courseModel.getCoursesByLecturer(userId, callback);


    fetchCourses((err, results) => {

        if (err) {
            return sendServerError(res, err, "Error fetching your courses");
        }

        res.json(results);

    });

};



// ================= UPDATE COURSE =================
const updateCourse = (req, res) => {

    const { id } = req.params;
    const { userId, role } = req.user;

    const {
        course_code,
        course_title,
        description,
        completion_target_minutes
    } = req.body;

    const data = {
        course_code,
        course_title,
        description,
        completion_target_minutes
    };

    const handleResult = (err, result) => {

        if (err) {
            return sendServerError(res, err, "Error updating course");
        }

        if (result.affectedRows === 0) {
            return res.status(403).json({
                message: "Not authorized or course not found"
            });
        }

        res.json({
            message: "Course updated successfully"
        });

    };


    if (role === "admin") {
        return courseModel.updateCourseById(id, data, handleResult);
    }

    courseModel.updateCourse(id, userId, data, handleResult);

};



// ================= DELETE COURSE =================
const deleteCourse = (req, res) => {

    const { id } = req.params;
    const { userId, role } = req.user;

    const handleResult = (err, result) => {

        if (err) {
            return sendServerError(res, err, "Error deleting course");
        }

        if (result.affectedRows === 0) {
            return res.status(403).json({
                message: "Not authorized or course not found"
            });
        }

        res.json({
            message: "Course deleted successfully"
        });

    };


    if (role === "admin") {
        return courseModel.deleteCourseById(id, handleResult);
    }

    courseModel.deleteCourse(id, userId, handleResult);

};



const reassignLecturer = (req, res) => {

    const { id } = req.params;
    const { lecturer_id } = req.body;

    courseModel.getCourseById(id, (courseErr, courseResults) => {

        if (courseErr) {
            return sendServerError(res, courseErr, "Error reassigning lecturer");
        }

        if (courseResults.length === 0) {
            return res.status(404).json({
                message: "Course not found"
            });
        }

        userModel.findUserById(lecturer_id, (userErr, userResults) => {

            if (userErr) {
                return sendServerError(res, userErr, "Error reassigning lecturer");
            }

            if (userResults.length === 0 || userResults[0].role !== "lecturer") {
                return res.status(400).json({
                    message: "A valid lecturer must be selected"
                });
            }

            courseModel.updateCourseLecturer(id, lecturer_id, (updateErr, result) => {

                if (updateErr) {
                    return sendServerError(res, updateErr, "Error reassigning lecturer");
                }

                if (result.affectedRows === 0) {
                    return res.status(404).json({
                        message: "Course not found"
                    });
                }

                res.json({
                    message: "Lecturer reassigned successfully"
                });

            });

        });

    });

};



const getLecturers = (req, res) => {

    courseModel.getLecturers((err, results) => {

        if (err) {
            return sendServerError(res, err, "Error fetching lecturers");
        }

        res.json(results);

    });

};



module.exports = {
    createCourse,
    getAllCourses,
    getCourseById,
    getMyCourses,
    updateCourse,
    deleteCourse,
    reassignLecturer,
    getLecturers
};
