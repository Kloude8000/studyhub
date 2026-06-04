const courseModel = require("../models/courseModel");
const sendServerError = require("../utils/sendServerError");



// ================= CREATE COURSE =================
const createCourse = (req, res) => {

    const lecturer_id = req.user.userId;

    const {
        course_code,
        course_title,
        description
    } = req.body;

    courseModel.createCourse({
        course_code,
        course_title,
        description,
        lecturer_id
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
        description
    } = req.body;

    const data = { course_code, course_title, description };

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



module.exports = {
    createCourse,
    getAllCourses,
    getCourseById,
    getMyCourses,
    updateCourse,
    deleteCourse
};
