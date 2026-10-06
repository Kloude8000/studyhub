const announcementModel = require("../models/announcementModel");
const { canManageCourse, canViewCourseResources } = require("../utils/courseAccess");
const {
    notifyCourseAnnouncement,
    notifyPlatformAnnouncement
} = require("../utils/notify");
const sendServerError = require("../utils/sendServerError");


const listCourseAnnouncements = (req, res) => {

    const courseId = req.params.courseId || req.params.id;
    const { userId, role } = req.user;

    canViewCourseResources(
        courseId,
        userId,
        role,
        (err, access) => {

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
                    message: "You do not have access to announcements for this course"
                });
            }

            announcementModel.listByCourse(courseId, (fetchErr, results) => {

                if (fetchErr) {
                    return sendServerError(res, fetchErr, "Error fetching announcements");
                }

                res.json(results);

            });

        }
    );

};


const createCourseAnnouncement = (req, res) => {

    const courseId = req.params.courseId || req.params.id;
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

            announcementModel.create(
                {
                    author_id: userId,
                    scope: "course",
                    course_id: courseId,
                    title,
                    body
                },
                (createErr, result) => {

                    if (createErr) {
                        return sendServerError(res, createErr, "Failed to create announcement");
                    }

                    notifyCourseAnnouncement(courseId, title, userId, () => {

                        res.status(201).json({
                            message: "Announcement posted",
                            announcement_id: result.insertId
                        });

                    });

                }
            );

        }
    );

};


const listPlatformAnnouncements = (req, res) => {

    announcementModel.listPlatform((err, results) => {

        if (err) {
            return sendServerError(res, err, "Error fetching announcements");
        }

        res.json(results);

    });

};


const createPlatformAnnouncement = (req, res) => {

    const { userId } = req.user;
    const { title, body } = req.body;

    announcementModel.create(
        {
            author_id: userId,
            scope: "platform",
            course_id: null,
            title,
            body
        },
        (err, result) => {

            if (err) {
                return sendServerError(res, err, "Failed to create announcement");
            }

            notifyPlatformAnnouncement(title, userId, () => {

                res.status(201).json({
                    message: "Announcement posted",
                    announcement_id: result.insertId
                });

            });

        }
    );

};


const deleteAnnouncement = (req, res) => {

    const { id } = req.params;
    const { userId, role } = req.user;

    announcementModel.getById(id, (err, rows) => {

        if (err) {
            return sendServerError(res, err, "Error deleting announcement");
        }

        if (rows.length === 0) {
            return res.status(404).json({
                message: "Announcement not found"
            });
        }

        const announcement = rows[0];
        const isAuthor = Number(announcement.author_id) === Number(userId);

        if (!isAuthor && role !== "admin") {
            return res.status(403).json({
                message: "You do not have permission to delete this announcement"
            });
        }

        announcementModel.deleteById(id, (deleteErr) => {

            if (deleteErr) {
                return sendServerError(res, deleteErr, "Failed to delete announcement");
            }

            res.json({ message: "Announcement deleted" });

        });

    });

};


const updateAnnouncement = (req, res) => {

    const { id } = req.params;
    const { userId, role } = req.user;
    const { title, body } = req.body;

    announcementModel.getById(id, (err, rows) => {

        if (err) {
            return sendServerError(res, err, "Error updating announcement");
        }

        if (rows.length === 0) {
            return res.status(404).json({
                message: "Announcement not found"
            });
        }

        const announcement = rows[0];
        const isAuthor = Number(announcement.author_id) === Number(userId);

        if (!isAuthor && role !== "admin") {
            return res.status(403).json({
                message: "You do not have permission to edit this announcement"
            });
        }

        announcementModel.updateById(
            id,
            { title, body },
            (updateErr) => {

                if (updateErr) {
                    return sendServerError(res, updateErr, "Failed to update announcement");
                }

                res.json({ message: "Announcement updated" });

            }
        );

    });

};


module.exports = {
    listCourseAnnouncements,
    createCourseAnnouncement,
    listPlatformAnnouncements,
    createPlatformAnnouncement,
    updateAnnouncement,
    deleteAnnouncement
};
