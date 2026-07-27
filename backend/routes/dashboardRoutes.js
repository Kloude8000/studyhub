const express = require("express");

const router = express.Router();
const dashboardController = require("../controllers/dashboardController");
const protect = require("../middleware/authMiddleware");
const authorizeRoles = require("../middleware/roleMiddleware");

router.get(
    "/admin",
    protect,
    authorizeRoles("admin"),
    dashboardController.getAdminDashboard
);

router.get(
    "/lecturer",
    protect,
    authorizeRoles("lecturer", "admin"),
    dashboardController.getLecturerDashboard
);

module.exports = router;
