const notificationModel = require("../models/notificationModel");
const sendServerError = require("../utils/sendServerError");


const listNotifications = (req, res) => {

    const userId = req.user.userId;
    const limit = Math.min(Number(req.query.limit) || 30, 100);

    notificationModel.listForUser(userId, limit, (err, results) => {

        if (err) {
            return sendServerError(res, err, "Error fetching notifications");
        }

        res.json(results);

    });

};


const getUnreadCount = (req, res) => {

    notificationModel.countUnread(req.user.userId, (err, rows) => {

        if (err) {
            return sendServerError(res, err, "Error fetching unread count");
        }

        res.json({ unread: Number(rows[0].total) || 0 });

    });

};


const markNotificationRead = (req, res) => {

    const { id } = req.params;

    notificationModel.markRead(id, req.user.userId, (err, result) => {

        if (err) {
            return sendServerError(res, err, "Error updating notification");
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({
                message: "Notification not found"
            });
        }

        res.json({ message: "Notification marked as read" });

    });

};


const markAllNotificationsRead = (req, res) => {

    notificationModel.markAllRead(req.user.userId, (err) => {

        if (err) {
            return sendServerError(res, err, "Error updating notifications");
        }

        res.json({ message: "All notifications marked as read" });

    });

};


module.exports = {
    listNotifications,
    getUnreadCount,
    markNotificationRead,
    markAllNotificationsRead
};
