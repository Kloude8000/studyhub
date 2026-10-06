require("dotenv").config();

require("./config/db");

//import express
const express = require("express");

const cors = require("cors");
const cookieParser = require("cookie-parser");

const authRoutes = require("./routes/authRoutes");
const courseRoutes = require("./routes/courseRoutes");
const enrollmentRoutes = require("./routes/enrollmentRoutes");
const resourceRoutes = require("./routes/resourceRoutes");
const progressRoutes = require("./routes/progressRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const announcementRoutes = require("./routes/announcementRoutes");

//create express app
const app = express();

app.use(cors());

//parse JSON bodies
app.use(express.json());

app.use(cookieParser());

app.use("/api/auth", authRoutes);
app.use("/api/courses", courseRoutes);
app.use("/api/enrollments", enrollmentRoutes);
app.use("/api/resources", resourceRoutes);
app.use("/api/progress", progressRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/announcements", announcementRoutes);

app.get("/", (req, res) => {
    res.send("StudyHub API Running");
});

app.use((req, res) => {
    res.status(404).json({ message: "Route not found" });
});

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
    if (err.name === "MulterError") {
        const message =
            err.code === "LIMIT_FILE_SIZE"
                ? "File is too large. Maximum size is 200 MB."
                : err.message || "Upload failed.";
        return res.status(400).json({ message });
    }

    if (err.message === "Unsupported file type") {
        return res.status(400).json({ message: err.message });
    }

    if (
        err.message === "Request aborted" ||
        err.code === "ECONNABORTED" ||
        err.code === "ECONNRESET"
    ) {
        if (!res.headersSent) {
            return res.status(400).json({ message: "Upload cancelled." });
        }
        return;
    }

    console.error("Unhandled error:", err);
    res.status(500).json({ message: "Internal server error" });
});

module.exports = app;
