const resourceModel = require("../models/resourceModel");
const { canManageCourse, canViewCourseResources } = require("../utils/courseAccess");
const { formatResource, formatResources } = require("../utils/resourceResponse");
const sendServerError = require("../utils/sendServerError");
const path = require("path");
const fs = require("fs");

const UPLOAD_ROOT = path.resolve("uploads", "resources");



// ================= UPLOAD RESOURCE =================
const uploadResource = (req, res) => {

    try {

        const uploaded_by = req.user.userId;
        const { role } = req.user;
        const { courseId } = req.params;
        const { title } = req.body;


        if (!req.file) {
            return res.status(400).json({
                message: "No file uploaded"
            });
        }


        canManageCourse(
            courseId,
            uploaded_by,
            role,
            (err, access) => {

                if (err) {
                    return sendServerError(res, err, "Database error");
                }

                if (access.notFound) {
                    return res.status(404).json({
                        message: "Course not found"
                    });
                }

                if (!access.allowed) {
                    return res.status(403).json({
                        message: "You can only upload to courses you manage"
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
                    (createErr, result) => {

                        if (createErr) {
                            return sendServerError(res, createErr, "Upload failed");
                        }

                        res.status(201).json({
                            message: "Resource uploaded successfully",
                            resource: formatResource({
                                resource_id: result.insertId,
                                ...resourceData
                            })
                        });

                    }
                );

            }
        );

    } catch (error) {
        sendServerError(res, error, "Server error");
    }

};



// ================= GET COURSE RESOURCES =================
const getCourseResources = (req, res) => {

    const { courseId } = req.params;
    const { userId, role } = req.user;


    canViewCourseResources(
        courseId,
        userId,
        role,
        (err, access) => {

            if (err) {
                return sendServerError(res, err, "Error checking resource access");
            }

            if (access.notFound) {
                return res.status(404).json({
                    message: "Course not found"
                });
            }

            if (!access.allowed) {
                return res.status(403).json({
                    message: "You do not have access to resources for this course"
                });
            }


            resourceModel.getResourcesByCourse(
                courseId,
                (fetchErr, results) => {

                    if (fetchErr) {
                        return sendServerError(res, fetchErr, "Error fetching resources");
                    }

                    res.json(formatResources(results));

                }
            );

        }
    );

};



// ================= SERVE RESOURCE FILE =================
const serveResource = (
    resourceId,
    userId,
    role,
    res,
    disposition,
    actionLabel
) => {

    resourceModel.getResourceById(
        resourceId,
        (err, resources) => {

            if (err) {
                return sendServerError(res, err, `Error ${actionLabel} resource`);
            }

            if (resources.length === 0) {
                return res.status(404).json({
                    message: "Resource not found"
                });
            }


            const resource = resources[0];


            canViewCourseResources(
                resource.course_id,
                userId,
                role,
                (accessErr, access) => {

                    if (accessErr) {
                        return sendServerError(
                            res,
                            accessErr,
                            `Error ${actionLabel} resource`
                        );
                    }

                    if (access.notFound) {
                        return res.status(404).json({
                            message: "Course not found"
                        });
                    }

                    if (!access.allowed) {
                        return res.status(403).json({
                            message: "You do not have access to this resource"
                        });
                    }


                    const filePath = path.resolve(resource.file_path);

                    if (
                        !filePath.startsWith(UPLOAD_ROOT + path.sep) &&
                        filePath !== UPLOAD_ROOT
                    ) {
                        return sendServerError(
                            res,
                            new Error("Invalid file path"),
                            `Error ${actionLabel} resource`
                        );
                    }

                    if (!fs.existsSync(filePath)) {
                        return res.status(404).json({
                            message: "File not found on server"
                        });
                    }


                    const filename = path.basename(filePath);

                    res.setHeader(
                        "Content-Type",
                        resource.file_type || "application/octet-stream"
                    );
                    res.setHeader(
                        "Content-Disposition",
                        `${disposition}; filename="${filename}"`
                    );
                    res.sendFile(filePath);

                }
            );

        }
    );

};



// ================= VIEW RESOURCE =================
const viewResource = (req, res) => {

    serveResource(
        req.params.resourceId,
        req.user.userId,
        req.user.role,
        res,
        "inline",
        "viewing"
    );

};



// ================= DOWNLOAD RESOURCE =================
const downloadResource = (req, res) => {

    serveResource(
        req.params.resourceId,
        req.user.userId,
        req.user.role,
        res,
        "attachment",
        "downloading"
    );

};



// ================= DELETE RESOURCE =================
const deleteResource = (req, res) => {

    const { userId, role } = req.user;
    const { resourceId } = req.params;


    resourceModel.getResourceById(
        resourceId,
        (err, resources) => {

            if (err) {
                return sendServerError(res, err, "Error deleting resource");
            }

            if (resources.length === 0) {
                return res.status(404).json({
                    message: "Resource not found"
                });
            }


            const resource = resources[0];


            const performDelete = (deleteErr, result) => {

                if (deleteErr) {
                    return sendServerError(res, deleteErr, "Error deleting resource");
                }

                if (result.affectedRows === 0) {
                    return res.status(403).json({
                        message: "Not authorized or resource not found"
                    });
                }

                const filePath = path.resolve(resource.file_path);

                if (
                    filePath.startsWith(UPLOAD_ROOT + path.sep) &&
                    fs.existsSync(filePath)
                ) {
                    fs.unlinkSync(filePath);
                }

                res.json({
                    message: "Resource deleted successfully"
                });

            };


            if (role === "admin") {
                return resourceModel.deleteResourceById(
                    resourceId,
                    performDelete
                );
            }


            canManageCourse(
                resource.course_id,
                userId,
                role,
                (accessErr, access) => {

                    if (accessErr) {
                        return sendServerError(res, accessErr, "Error deleting resource");
                    }

                    if (!access.allowed) {
                        return res.status(403).json({
                            message: "Not authorized or resource not found"
                        });
                    }

                    resourceModel.deleteResourceById(
                        resourceId,
                        performDelete
                    );

                }
            );

        }
    );

};



module.exports = {
    uploadResource,
    getCourseResources,
    viewResource,
    downloadResource,
    deleteResource
};
