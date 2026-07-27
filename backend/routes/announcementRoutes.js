const express = require("express");

const router = express.Router();
const announcementController = require("../controllers/announcementController");
const protect = require("../middleware/authMiddleware");
const authorizeRoles = require("../middleware/roleMiddleware");
const { validateAnnouncement } = require("../validations/announcementValidation");

router.post(
    "/course/:courseId",
    protect,
    authorizeRoles("lecturer", "admin"),
    validateAnnouncement,
    announcementController.createAnnouncement
);

router.get(
    "/course/:courseId",
    protect,
    announcementController.getCourseAnnouncements
);

router.delete(
    "/:announcementId",
    protect,
    authorizeRoles("lecturer", "admin"),
    announcementController.deleteAnnouncement
);

module.exports = router;
