const express = require("express");

const router = express.Router();

const protect = require("../middleware/authMiddleware");

const authorizeRoles = require("../middleware/roleMiddleware");

const announcementController = require("../controllers/announcementController");

const { validateAnnouncement } = require("../validations/courseValidation");


router.get(
    "/platform",
    protect,
    announcementController.listPlatformAnnouncements
);

router.post(
    "/platform",
    protect,
    authorizeRoles("admin"),
    validateAnnouncement,
    announcementController.createPlatformAnnouncement
);

router.get(
    "/course/:courseId",
    protect,
    announcementController.listCourseAnnouncements
);

router.post(
    "/course/:courseId",
    protect,
    authorizeRoles("lecturer", "admin"),
    validateAnnouncement,
    announcementController.createCourseAnnouncement
);

router.delete(
    "/:id",
    protect,
    announcementController.deleteAnnouncement
);

router.put(
    "/:id",
    protect,
    validateAnnouncement,
    announcementController.updateAnnouncement
);


module.exports = router;
