const userModel = require("../models/userModel");
const { sendCsv, sendPdfTable } = require("../utils/exportHelpers");
const sendServerError = require("../utils/sendServerError");

const VALID_CATEGORIES = [
    "lecturers",
    "admins",
    "not_enrolled",
    "students_by_course"
];

const listUsers = (req, res) => {
    const { role, category, courseId } = req.query;

    if (category) {
        if (!VALID_CATEGORIES.includes(category)) {
            return res.status(400).json({
                message:
                    "Category must be lecturers, admins, not_enrolled, or students_by_course"
            });
        }

        if (category === "students_by_course" && !courseId) {
            return res.status(400).json({
                message: "courseId is required for students_by_course"
            });
        }

        return userModel.getUsersByCategory(
            category,
            courseId || null,
            (err, results) => {
                if (err) {
                    return sendServerError(res, err, "Error fetching users");
                }

                res.json(results);
            }
        );
    }

    if (role && !["student", "lecturer", "admin"].includes(role)) {
        return res.status(400).json({
            message: "Role must be student, lecturer, or admin"
        });
    }

    userModel.getUsers(role || null, (err, results) => {
        if (err) {
            return sendServerError(res, err, "Error fetching users");
        }

        res.json(results);
    });
};


const getUserCategoryCounts = (req, res) => {
    userModel.getCategoryCounts((err, results) => {
        if (err) {
            return sendServerError(res, err, "Error fetching user counts");
        }

        res.json(results[0] || {
            lecturers: 0,
            admins: 0,
            not_enrolled: 0,
            students: 0
        });
    });
};


const listStudentReports = (req, res) => {
    const status = (req.query.status || "all").toLowerCase();
    const courseId = req.query.courseId || null;

    if (!["all", "enrolled", "unenrolled"].includes(status)) {
        return res.status(400).json({
            message: "Status must be all, enrolled, or unenrolled"
        });
    }

    userModel.getStudentReportRows({ status, courseId }, (err, results) => {
        if (err) {
            return sendServerError(res, err, "Error fetching student report");
        }

        const rows = results.map((row) => ({
            ...row,
            status: Number(row.enrollment_count) > 0 ? "Enrolled" : "Unenrolled",
            avg_progress: Number(row.avg_progress) || 0,
            total_study_time: Number(row.total_study_time) || 0,
            enrollment_count: Number(row.enrollment_count) || 0
        }));

        res.json({
            generated_at: new Date().toISOString(),
            count: rows.length,
            rows
        });
    });
};


const listLecturerReports = (req, res) => {
    userModel.getLecturerReportRows((err, results) => {
        if (err) {
            return sendServerError(res, err, "Error fetching lecturer report");
        }

        const rows = results.map((row) => ({
            ...row,
            courses_taught: Number(row.courses_taught) || 0,
            total_students: Number(row.total_students) || 0,
            avg_student_progress: Number(row.avg_student_progress) || 0
        }));

        res.json({
            generated_at: new Date().toISOString(),
            count: rows.length,
            rows
        });
    });
};


const getStudentReportDetail = (req, res) => {
    const { studentId } = req.params;

    userModel.getStudentReportDetail(studentId, (err, detail) => {
        if (err) {
            return sendServerError(res, err, "Error fetching student detail");
        }

        if (!detail) {
            return res.status(404).json({
                message: "Student not found"
            });
        }

        res.json(detail);
    });
};


const exportUsersReport = (req, res) => {
    const format = (req.query.format || "csv").toLowerCase();
    const { role, category, courseId } = req.query;

    if (category) {
        if (!VALID_CATEGORIES.includes(category)) {
            return res.status(400).json({
                message: "Invalid category for export"
            });
        }

        return userModel.getUsersByCategory(
            category,
            courseId || null,
            (err, results) => {
                if (err) {
                    return sendServerError(res, err, "Error generating report");
                }

                const headers = ["Name", "Email", "Role", "Joined"];
                const rows = results.map((user) => [
                    user.full_name,
                    user.email,
                    user.role,
                    user.created_at
                        ? new Date(user.created_at).toISOString().slice(0, 10)
                        : ""
                ]);

                const filename = `studyhub-${category}-users.${format}`;
                const title = `StudyHub ${category.replace(/_/g, " ")} users`;

                if (format === "pdf") {
                    return sendPdfTable(res, filename, title, headers, rows);
                }

                if (format === "csv") {
                    return sendCsv(res, filename, headers, rows);
                }

                res.status(400).json({ message: "Format must be csv or pdf" });
            }
        );
    }

    if (role && !["student", "lecturer"].includes(role)) {
        return res.status(400).json({
            message: "Role must be student or lecturer"
        });
    }

    userModel.getReportUsers((err, results) => {
        if (err) {
            return sendServerError(res, err, "Error generating report");
        }

        const filtered = role
            ? results.filter((user) => user.role === role)
            : results;

        const headers = [
            "Name",
            "Email",
            "Role",
            "Enrollments",
            "Courses Taught",
            "Joined"
        ];

        const rows = filtered.map((user) => [
            user.full_name,
            user.email,
            user.role,
            user.role === "student" ? user.enrollment_count : "—",
            user.role === "lecturer" ? user.courses_taught : "—",
            user.created_at
                ? new Date(user.created_at).toISOString().slice(0, 10)
                : ""
        ]);

        const roleLabel = role ? `${role}s` : "users";
        const filename = `studyhub-${roleLabel}-report.${format}`;
        const title = `StudyHub ${roleLabel} report`;

        if (format === "pdf") {
            return sendPdfTable(res, filename, title, headers, rows);
        }

        if (format === "csv") {
            return sendCsv(res, filename, headers, rows);
        }

        res.status(400).json({
            message: "Format must be csv or pdf"
        });
    });
};


const exportStudentReports = (req, res) => {
    const format = (req.query.format || "csv").toLowerCase();
    const status = (req.query.status || "all").toLowerCase();
    const courseId = req.query.courseId || null;

    userModel.getStudentReportRows({ status, courseId }, (err, results) => {
        if (err) {
            return sendServerError(res, err, "Error exporting student report");
        }

        const headers = [
            "Name",
            "Email",
            "Student ID",
            "Status",
            "Courses",
            "Avg Progress %",
            "Study Time (min)",
            "Last Log"
        ];

        const rows = results.map((row) => [
            row.full_name,
            row.email,
            row.user_id,
            Number(row.enrollment_count) > 0 ? "Enrolled" : "Unenrolled",
            row.enrollment_count,
            Number(row.avg_progress) || 0,
            Number(row.total_study_time) || 0,
            row.last_log_date
                ? new Date(row.last_log_date).toISOString().slice(0, 10)
                : "—"
        ]);

        const filename = `studyhub-students-report.${format}`;

        if (format === "pdf") {
            return sendPdfTable(
                res,
                filename,
                "StudyHub students report",
                headers,
                rows
            );
        }

        if (format === "csv") {
            return sendCsv(res, filename, headers, rows);
        }

        res.status(400).json({ message: "Format must be csv or pdf" });
    });
};


const exportLecturerReports = (req, res) => {
    const format = (req.query.format || "csv").toLowerCase();

    userModel.getLecturerReportRows((err, results) => {
        if (err) {
            return sendServerError(res, err, "Error exporting lecturer report");
        }

        const headers = [
            "Name",
            "Email",
            "Courses Taught",
            "Total Students",
            "Avg Student Progress %",
            "Joined"
        ];

        const rows = results.map((row) => [
            row.full_name,
            row.email,
            row.courses_taught,
            row.total_students,
            Number(row.avg_student_progress) || 0,
            row.created_at
                ? new Date(row.created_at).toISOString().slice(0, 10)
                : ""
        ]);

        const filename = `studyhub-lecturers-report.${format}`;

        if (format === "pdf") {
            return sendPdfTable(
                res,
                filename,
                "StudyHub lecturers report",
                headers,
                rows
            );
        }

        if (format === "csv") {
            return sendCsv(res, filename, headers, rows);
        }

        res.status(400).json({ message: "Format must be csv or pdf" });
    });
};


module.exports = {
    listUsers,
    getUserCategoryCounts,
    listStudentReports,
    listLecturerReports,
    getStudentReportDetail,
    exportUsersReport,
    exportStudentReports,
    exportLecturerReports
};
