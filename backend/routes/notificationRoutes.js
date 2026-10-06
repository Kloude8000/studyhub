const express = require("express");

const router = express.Router();

const protect = require("../middleware/authMiddleware");

const notificationController = require("../controllers/notificationController");


router.get(
    "/",
    protect,
    notificationController.listNotifications
);

router.get(
    "/unread-count",
    protect,
    notificationController.getUnreadCount
);

router.put(
    "/read-all",
    protect,
    notificationController.markAllNotificationsRead
);

router.put(
    "/:id/read",
    protect,
    notificationController.markNotificationRead
);


module.exports = router;
