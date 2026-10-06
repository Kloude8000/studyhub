const reportModel = require("../models/reportModel");
const sendServerError = require("../utils/sendServerError");
const {
    aggregateLecturerReports,
    attachStudentsToLecturer,
    attachTopicsToCourses,
    buildLecturerListCsv,
    buildLecturerDetailCsv,
    buildStudentListCsv,
    buildStudentDetailCsv,
    buildLecturerListPdf,
    buildLecturerDetailPdf,
    buildStudentListPdf,
    buildStudentDetailPdf
} = require("../utils/reportExport");

const generatedTimestamp = () => new Date().toISOString();

const filenameStamp = () => new Date().toISOString().slice(0, 10);

const parseStudentFilters = (query) => ({
    courseId: query.courseId ? Number(query.courseId) : null,
    status: ["all", "enrolled", "unenrolled"].includes(query.status)
        ? query.status
        : "all"
});

const filterLabel = (filters) => {
    if (filters.courseId) return `Course ID ${filters.courseId}`;
    if (filters.status === "enrolled") return "Enrolled students only";
    if (filters.status === "unenrolled") return "Unenrolled students only";
    return "All students";
};

const roundProgress = (value) => Number(Number(value || 0).toFixed(2));

const formatLecturerSummary = (lecturer) => {
    const {
        avg_progress_sum,
        avg_progress_courses,
        courses,
        ...summary
    } = lecturer;
    return {
        ...summary,
        avg_progress: roundProgress(lecturer.avg_progress)
    };
};

const formatLecturerDetail = (lecturer) => ({
    ...formatLecturerSummary(lecturer),
    courses: (lecturer.courses || []).map((c) => ({
        ...c,
        avg_progress: roundProgress(c.avg_progress)
    }))
});

const formatStudent = (student) => ({
    ...student,
    avg_progress: roundProgress(student.avg_progress),
    courses_completed: Number(student.courses_completed) || 0,
    resources_viewed: Number(student.resources_viewed) || 0,
    resources_downloaded: Number(student.resources_downloaded) || 0
});

const loadLecturers = (callback) => {
    reportModel.getLecturerReportRows((err, rows) => {
        if (err) return callback(err);
        callback(null, aggregateLecturerReports(rows));
    });
};

const findLecturer = (lecturers, userId) =>
    lecturers.find((l) => Number(l.lecturer_id) === Number(userId));

const loadLecturerDetail = (userId, callback) => {
    loadLecturers((err, lecturers) => {
        if (err) return callback(err);
        const lecturer = findLecturer(lecturers, userId);
        if (!lecturer) return callback(null, null);
        reportModel.getLecturerCourseStudents(userId, (studentErr, students) => {
            if (studentErr) return callback(studentErr);
            callback(null, attachStudentsToLecturer(lecturer, students));
        });
    });
};

const loadStudentDetail = (userId, callback) => {
    reportModel.getStudentReportRows({ courseId: null, status: "all" }, (err, students) => {
        if (err) return callback(err);
        const student = students.find((s) => Number(s.student_id) === Number(userId));
        if (!student) return callback(null, null, null);
        reportModel.getStudentCourseBreakdown(userId, (courseErr, courses) => {
            if (courseErr) return callback(courseErr);
            reportModel.getStudentTopicChecklist(userId, (topicErr, topics) => {
                if (topicErr) return callback(topicErr);
                callback(null, formatStudent(student), attachTopicsToCourses(courses, topics));
            });
        });
    });
};

const getLecturerReports = (req, res) => {
    loadLecturers((err, lecturers) => {
        if (err) return sendServerError(res, err, "Error generating lecturer report");
        res.json({
            generated_at: generatedTimestamp(),
            count: lecturers.length,
            lecturers: lecturers.map(formatLecturerSummary)
        });
    });
};

const getLecturerReportById = (req, res) => {
    loadLecturerDetail(req.params.userId, (err, lecturer) => {
        if (err) return sendServerError(res, err, "Error generating lecturer report");
        if (!lecturer) {
            return res.status(404).json({ message: "Lecturer not found" });
        }
        res.json({
            generated_at: generatedTimestamp(),
            lecturer: formatLecturerDetail(lecturer)
        });
    });
};

const exportLecturerReports = (req, res) => {
    const format = (req.query.format || "csv").toLowerCase();
    if (!["csv", "pdf"].includes(format)) {
        return res.status(400).json({ message: "Format must be csv or pdf" });
    }

    loadLecturers((err, lecturers) => {
        if (err) return sendServerError(res, err, "Error exporting lecturer report");

        const generatedAt = generatedTimestamp();
        const stamp = filenameStamp();

        if (format === "csv") {
            const csv = buildLecturerListCsv(lecturers, generatedAt);
            res.setHeader("Content-Type", "text/csv; charset=utf-8");
            res.setHeader(
                "Content-Disposition",
                `attachment; filename="studyhub-lecturers-${stamp}.csv"`
            );
            return res.send(csv);
        }

        buildLecturerListPdf(
            res,
            `studyhub-lecturers-${stamp}.pdf`,
            lecturers,
            generatedAt
        );
    });
};

const exportLecturerReportById = (req, res) => {
    const format = (req.query.format || "csv").toLowerCase();
    if (!["csv", "pdf"].includes(format)) {
        return res.status(400).json({ message: "Format must be csv or pdf" });
    }

    loadLecturerDetail(req.params.userId, (err, lecturer) => {
        if (err) return sendServerError(res, err, "Error exporting lecturer report");
        if (!lecturer) {
            return res.status(404).json({ message: "Lecturer not found" });
        }

        const generatedAt = generatedTimestamp();
        const stamp = filenameStamp();
        const safeName = lecturer.full_name.replace(/[^a-z0-9]+/gi, "-").toLowerCase();
        const detail = formatLecturerDetail(lecturer);

        if (format === "csv") {
            const csv = buildLecturerDetailCsv(detail, generatedAt);
            res.setHeader("Content-Type", "text/csv; charset=utf-8");
            res.setHeader(
                "Content-Disposition",
                `attachment; filename="studyhub-lecturer-${safeName}-${stamp}.csv"`
            );
            return res.send(csv);
        }

        buildLecturerDetailPdf(
            res,
            `studyhub-lecturer-${safeName}-${stamp}.pdf`,
            detail,
            generatedAt
        );
    });
};

const getStudentReports = (req, res) => {
    const filters = parseStudentFilters(req.query);
    reportModel.getStudentReportRows(filters, (err, students) => {
        if (err) return sendServerError(res, err, "Error generating student report");
        res.json({
            generated_at: generatedTimestamp(),
            filter: filters,
            count: students.length,
            students: students.map(formatStudent)
        });
    });
};

const getStudentReportById = (req, res) => {
    loadStudentDetail(req.params.userId, (err, student, courses) => {
        if (err) return sendServerError(res, err, "Error generating student report");
        if (!student) {
            return res.status(404).json({ message: "Student not found" });
        }
        res.json({
            generated_at: generatedTimestamp(),
            student,
            courses: courses.map((c) => ({
                ...c,
                completion_percentage: roundProgress(c.completion_percentage)
            }))
        });
    });
};

const exportStudentReports = (req, res) => {
    const format = (req.query.format || "csv").toLowerCase();
    if (!["csv", "pdf"].includes(format)) {
        return res.status(400).json({ message: "Format must be csv or pdf" });
    }

    const filters = parseStudentFilters(req.query);
    reportModel.getStudentReportRows(filters, (err, students) => {
        if (err) return sendServerError(res, err, "Error exporting student report");

        const generatedAt = generatedTimestamp();
        const stamp = filenameStamp();
        const label = filterLabel(filters);

        if (format === "csv") {
            const csv = buildStudentListCsv(students, generatedAt, label);
            res.setHeader("Content-Type", "text/csv; charset=utf-8");
            res.setHeader(
                "Content-Disposition",
                `attachment; filename="studyhub-students-${stamp}.csv"`
            );
            return res.send(csv);
        }

        buildStudentListPdf(
            res,
            `studyhub-students-${stamp}.pdf`,
            students,
            generatedAt,
            label
        );
    });
};

const exportStudentReportById = (req, res) => {
    const format = (req.query.format || "csv").toLowerCase();
    if (!["csv", "pdf"].includes(format)) {
        return res.status(400).json({ message: "Format must be csv or pdf" });
    }

    loadStudentDetail(req.params.userId, (err, student, courses) => {
        if (err) return sendServerError(res, err, "Error exporting student report");
        if (!student) {
            return res.status(404).json({ message: "Student not found" });
        }

        const generatedAt = generatedTimestamp();
        const stamp = filenameStamp();
        const safeName = student.student_name.replace(/[^a-z0-9]+/gi, "-").toLowerCase();

        if (format === "csv") {
            const csv = buildStudentDetailCsv(student, courses, generatedAt);
            res.setHeader("Content-Type", "text/csv; charset=utf-8");
            res.setHeader(
                "Content-Disposition",
                `attachment; filename="studyhub-student-${safeName}-${stamp}.csv"`
            );
            return res.send(csv);
        }

        buildStudentDetailPdf(
            res,
            `studyhub-student-${safeName}-${stamp}.pdf`,
            student,
            courses,
            generatedAt
        );
    });
};

module.exports = {
    getLecturerReports,
    getLecturerReportById,
    exportLecturerReports,
    exportLecturerReportById,
    getStudentReports,
    getStudentReportById,
    exportStudentReports,
    exportStudentReportById
};
