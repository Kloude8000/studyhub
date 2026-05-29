const express = require("express");

const router = express.Router();

const resourceController = require("../controllers/resourceController");

const protect = require("../middleware/authMiddleware");

const authorizeRoles = require("../middleware/roleMiddleware");

const upload = require("../utils/multerConfig");



// ================= UPLOAD RESOURCE =================
router.post(
    "/upload/:courseId",
    protect,
    authorizeRoles("lecturer", "admin"),
    upload.single("file"),
    resourceController.uploadResource
);



// ================= GET COURSE RESOURCES =================
router.get(
    "/course/:courseId",
    protect,
    resourceController.getCourseResources
);



// ================= DELETE RESOURCE =================
router.delete(
    "/:resourceId",
    protect,
    authorizeRoles("lecturer", "admin"),
    resourceController.deleteResource
);


module.exports = router;