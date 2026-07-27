const announcementModel = require("../models/announcementModel");
const { canManageCourse } = require("../utils/courseAccess");
const progressModel = require("../models/progressModel");
const sendServerError = require("../utils/sendServerError");

const createAnnouncement = (req, res) => {

    const { courseId } = req.params;
    const { userId, role } = req.user;
    const { title, body } = req.body;

    canManageCourse(
        courseId,
        userId,
        role,
        (err, access) => {

            if (err) {
                return sendServerError(res, err, "Error creating announcement");
            }

            if (access.notFound) {
                return res.status(404).json({
                    message: "Course not found"
                });
            }

            if (!access.allowed) {
                return res.status(403).json({
                    message: "You do not have permission to post announcements for this course"
                });
            }

            announcementModel.createAnnouncement(
                {
                    course_id: courseId,
                    title,
                    body,
                    created_by: userId
                },
                (createErr, result) => {

                    if (createErr) {
                        return sendServerError(res, createErr, "Failed to create announcement");
                    }

                    res.status(201).json({
                        message: "Announcement posted",
                        announcement_id: result.insertId
                    });

                }
            );

        }
    );

};


const getCourseAnnouncements = (req, res) => {

    const { courseId } = req.params;
    const { userId, role } = req.user;

    const allowRead = (callback) => {

        if (role === "lecturer" || role === "admin") {
            return canManageCourse(courseId, userId, role, callback);
        }

        return progressModel.checkEnrollment(
            userId,
            courseId,
            (err, enrollmentResults) => {

                if (err) {
                    return callback(err);
                }

                if (enrollmentResults.length === 0) {
                    return callback(null, {
                        allowed: false,
                        notFound: false
                    });
                }

                callback(null, { allowed: true });

            }
        );

    };

    allowRead((err, access) => {

        if (err) {
            return sendServerError(res, err, "Error fetching announcements");
        }

        if (access.notFound) {
            return res.status(404).json({
                message: "Course not found"
            });
        }

        if (!access.allowed) {
            return res.status(403).json({
                message: "You do not have permission to view announcements for this course"
            });
        }

        announcementModel.getAnnouncementsByCourse(
            courseId,
            (fetchErr, results) => {

                if (fetchErr) {
                    return sendServerError(res, fetchErr, "Error fetching announcements");
                }

                res.json(results);

            }
        );

    });

};


const deleteAnnouncement = (req, res) => {

    const { announcementId } = req.params;
    const { userId, role } = req.user;

    announcementModel.getAnnouncementById(
        announcementId,
        (err, results) => {

            if (err) {
                return sendServerError(res, err, "Error deleting announcement");
            }

            if (results.length === 0) {
                return res.status(404).json({
                    message: "Announcement not found"
                });
            }

            const announcement = results[0];

            canManageCourse(
                announcement.course_id,
                userId,
                role,
                (accessErr, access) => {

                    if (accessErr) {
                        return sendServerError(res, accessErr, "Error deleting announcement");
                    }

                    if (!access.allowed) {
                        return res.status(403).json({
                            message: "You do not have permission to delete this announcement"
                        });
                    }

                    announcementModel.deleteAnnouncement(
                        announcementId,
                        (deleteErr, result) => {

                            if (deleteErr) {
                                return sendServerError(res, deleteErr, "Failed to delete announcement");
                            }

                            if (result.affectedRows === 0) {
                                return res.status(404).json({
                                    message: "Announcement not found"
                                });
                            }

                            res.json({
                                message: "Announcement deleted"
                            });

                        }
                    );

                }
            );

        }
    );

};


module.exports = {
    createAnnouncement,
    getCourseAnnouncements,
    deleteAnnouncement
};
