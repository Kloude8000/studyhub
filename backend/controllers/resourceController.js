const resourceModel = require("../models/resourceModel");

const path = require("path");

const fs = require("fs");



// ================= UPLOAD RESOURCE =================
const uploadResource = (req, res) => {

    try {

        const uploaded_by = req.user.userId;

        const { courseId } = req.params;

        const { title } = req.body;


        // File validation
        if (!req.file) {

            return res.status(400).json({
                message: "No file uploaded"
            });

        }


        // Check course ownership
        resourceModel.checkCourseOwnership(
            courseId,
            uploaded_by,
            (err, results) => {

                if (err) {
                    return res.status(500).json({
                        message: "Database error",
                        error: err
                    });
                }

                if (results.length === 0) {

                    return res.status(403).json({
                        message: "You can only upload to your own courses"
                    });

                }


                const resourceData = {

                    course_id: courseId,

                    uploaded_by,

                    title,

                    file_path: req.file.path,

                    file_type: req.file.mimetype

                };


                resourceModel.createResource(
                    resourceData,
                    (err, result) => {

                        if (err) {

                            return res.status(500).json({
                                message: "Upload failed",
                                error: err
                            });

                        }

                        res.status(201).json({

                            message: "Resource uploaded successfully",

                            resource: {
                                resource_id: result.insertId,
                                ...resourceData
                            }

                        });

                    }
                );

            }
        );

    } catch (error) {

        res.status(500).json({
            message: "Server error",
            error
        });

    }

};



// ================= GET COURSE RESOURCES =================
const getCourseResources = (req, res) => {

    const { courseId } = req.params;

    resourceModel.getResourcesByCourse(
        courseId,
        (err, results) => {

            if (err) {

                return res.status(500).json({
                    message: "Error fetching resources",
                    error: err
                });

            }

            res.json(results);

        }
    );

};



// ================= DELETE RESOURCE =================
const deleteResource = (req, res) => {

    const uploadedBy = req.user.userId;

    const { resourceId } = req.params;

    resourceModel.deleteResource(
        resourceId,
        uploadedBy,
        (err, result) => {

            if (err) {

                return res.status(500).json({
                    message: "Error deleting resource",
                    error: err
                });

            }

            if (result.affectedRows === 0) {

                return res.status(403).json({
                    message: "Not authorized or resource not found"
                });

            }

            res.json({
                message: "Resource deleted successfully"
            });

        }
    );

};



module.exports = {
    uploadResource,
    getCourseResources,
    deleteResource
};