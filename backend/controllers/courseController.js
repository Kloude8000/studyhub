const courseModel = require("../models/courseModel");



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
            return res.status(500).json({
                message: "Error creating course",
                error: err
            });
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
            return res.status(500).json({
                message: "Error fetching courses",
                error: err
            });
        }

        res.json(results);

    });

};



// ================= GET SINGLE COURSE =================
const getCourseById = (req, res) => {

    const { id } = req.params;

    courseModel.getCourseById(id, (err, results) => {

        if (err) {
            return res.status(500).json({
                message: "Error fetching course",
                error: err
            });
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

    const lecturerId = req.user.userId;

    courseModel.getCoursesByLecturer(lecturerId, (err, results) => {

        if (err) {
            return res.status(500).json({
                message: "Error fetching your courses",
                error: err
            });
        }

        res.json(results);

    });

};



// ================= UPDATE COURSE =================
const updateCourse = (req, res) => {

    const { id } = req.params;

    const lecturerId = req.user.userId;

    const {
        course_code,
        course_title,
        description
    } = req.body;

    courseModel.updateCourse(
        id,
        lecturerId,
        { course_code, course_title, description },
        (err, result) => {

            if (err) {
                return res.status(500).json({
                    message: "Error updating course",
                    error: err
                });
            }

            if (result.affectedRows === 0) {
                return res.status(403).json({
                    message: "Not authorized or course not found"
                });
            }

            res.json({
                message: "Course updated successfully"
            });

        }
    );

};



// ================= DELETE COURSE =================
const deleteCourse = (req, res) => {

    const { id } = req.params;

    const lecturerId = req.user.userId;

    courseModel.deleteCourse(id, lecturerId, (err, result) => {

        if (err) {
            return res.status(500).json({
                message: "Error deleting course",
                error: err
            });
        }

        if (result.affectedRows === 0) {
            return res.status(403).json({
                message: "Not authorized or course not found"
            });
        }

        res.json({
            message: "Course deleted successfully"
        });

    });

};



module.exports = {
    createCourse,
    getAllCourses,
    getCourseById,
    getMyCourses,
    updateCourse,
    deleteCourse
};