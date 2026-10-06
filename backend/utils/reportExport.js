const PDFDocument = require("pdfkit");

const escapeCsv = (value) => {
    if (value == null) return "";
    const str = String(value);
    if (/[",\n\r]/.test(str)) {
        return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
};

const rowsToCsv = (headers, rows) => {
    const lines = [headers.map(escapeCsv).join(",")];
    rows.forEach((row) => {
        lines.push(row.map(escapeCsv).join(","));
    });
    return lines.join("\r\n");
};

const formatDate = (value) => {
    if (!value) return "-";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "-";
    return d.toLocaleDateString("en-GB");
};

const formatNumber = (value, digits = 1) => {
    const num = Number(value);
    if (Number.isNaN(num)) return "0";
    return num.toFixed(digits);
};

const courseStatus = (row) => {
    if (row.completed_at) return "Completed";
    if (Number(row.topics_completed) > 0 || row.last_activity_at) return "In progress";
    return "Not started";
};

const attachTopicsToCourses = (courses, topics) => {
    const byCourse = new Map();
    (topics || []).forEach((topic) => {
        const id = Number(topic.course_id);
        if (!byCourse.has(id)) byCourse.set(id, []);
        byCourse.get(id).push({
            topic_id: topic.topic_id,
            title: topic.title,
            sort_order: topic.sort_order,
            completed: Number(topic.completed) === 1,
            log_date: topic.log_date || null,
            study_duration: topic.study_duration || null
        });
    });
    return (courses || []).map((course) => ({
        ...course,
        status: courseStatus(course),
        topics: byCourse.get(Number(course.course_id)) || []
    }));
};

const attachStudentsToLecturer = (lecturer, students) => {
    const byCourse = new Map();
    (students || []).forEach((row) => {
        const id = Number(row.course_id);
        if (!byCourse.has(id)) byCourse.set(id, []);
        byCourse.get(id).push({
            student_user_id: row.student_user_id,
            student_name: row.student_name,
            student_number: row.student_number,
            topics_completed: Number(row.topics_completed) || 0,
            topics_total: Number(row.topics_total) || 0,
            total_study_time: Number(row.total_study_time) || 0,
            completion_percentage: Number(row.completion_percentage) || 0,
            last_activity_at: row.last_activity_at || null,
            status: courseStatus(row)
        });
    });
    return {
        ...lecturer,
        courses: (lecturer.courses || []).map((course) => ({
            ...course,
            students: byCourse.get(Number(course.course_id)) || []
        }))
    };
};

const aggregateLecturerReports = (rows) => {
    const map = new Map();

    rows.forEach((row) => {
        const id = row.lecturer_id;
        if (!map.has(id)) {
            map.set(id, {
                lecturer_id: id,
                full_name: row.lecturer_name,
                email: row.lecturer_email,
                created_at: row.lecturer_joined,
                unique_students: Number(row.unique_students) || 0,
                course_count: 0,
                total_students: 0,
                topics_defined: 0,
                resources_uploaded: 0,
                students_completed: 0,
                students_in_progress: 0,
                courses_without_topics: 0,
                avg_progress_sum: 0,
                avg_progress_courses: 0,
                courses: []
            });
        }
        const lecturer = map.get(id);
        if (!row.course_id) return;

        const enrollmentCount = Number(row.enrollment_count) || 0;
        const completedCount = Number(row.completed_count) || 0;
        const inProgressCount = Number(row.in_progress_count) || 0;
        const notStartedCount = Math.max(0, enrollmentCount - completedCount - inProgressCount);
        const avgProgress = Number(row.avg_progress) || 0;
        const topicCount = Number(row.topic_count) || 0;

        lecturer.course_count += 1;
        lecturer.total_students += enrollmentCount;
        lecturer.topics_defined += topicCount;
        lecturer.resources_uploaded += Number(row.resource_count) || 0;
        lecturer.students_completed += completedCount;
        lecturer.students_in_progress += inProgressCount;
        if (topicCount === 0) lecturer.courses_without_topics += 1;
        lecturer.avg_progress_sum += avgProgress;
        lecturer.avg_progress_courses += 1;
        lecturer.courses.push({
            course_id: row.course_id,
            course_code: row.course_code,
            course_title: row.course_title,
            enrollment_count: enrollmentCount,
            resource_count: Number(row.resource_count) || 0,
            topic_count: topicCount,
            avg_progress: avgProgress,
            completed_count: completedCount,
            in_progress_count: inProgressCount,
            not_started_count: notStartedCount,
            inactive_7d: Number(row.inactive_7d) || 0,
            students_viewed: Number(row.students_viewed) || 0,
            students_downloaded: Number(row.students_downloaded) || 0
        });
    });

    return Array.from(map.values()).map((lecturer) => ({
        ...lecturer,
        avg_progress:
            lecturer.avg_progress_courses > 0
                ? lecturer.avg_progress_sum / lecturer.avg_progress_courses
                : 0
    }));
};

const buildLecturerListCsv = (lecturers, generatedAt) => {
    const headers = [
        "Lecturer Name",
        "Email",
        "Courses Taught",
        "Courses Without Topics",
        "Unique Students",
        "Enrolment Seats",
        "Avg Progress (%)",
        "Joined Date"
    ];
    const rows = lecturers.map((l) => [
        l.full_name,
        l.email,
        l.course_count,
        l.courses_without_topics || 0,
        l.unique_students || 0,
        l.total_students,
        formatNumber(l.avg_progress),
        formatDate(l.created_at)
    ]);
    const meta = `# StudyHub Lecturer Report\r\n# Generated: ${generatedAt}\r\n\r\n`;
    return meta + rowsToCsv(headers, rows);
};

const buildLecturerDetailCsv = (lecturer, generatedAt) => {
    const meta = [
        `# StudyHub Lecturer Detail Report`,
        `# Generated: ${generatedAt}`,
        `# Lecturer: ${lecturer.full_name}`,
        `# Email: ${lecturer.email}`,
        ""
    ].join("\r\n");

    const summaryHeaders = ["Metric", "Value"];
    const summaryRows = [
        ["Courses Taught", lecturer.course_count],
        ["Courses Without Topics", lecturer.courses_without_topics || 0],
        ["Unique Students", lecturer.unique_students || 0],
        ["Enrolment Seats", lecturer.total_students],
        ["Topics Defined", lecturer.topics_defined || 0],
        ["Resources Uploaded", lecturer.resources_uploaded || 0],
        ["Students Completed", lecturer.students_completed || 0],
        ["Students In Progress", lecturer.students_in_progress || 0],
        ["Average Progress (%)", formatNumber(lecturer.avg_progress)],
        ["Joined Date", formatDate(lecturer.created_at)]
    ];

    const courseHeaders = [
        "Course Code",
        "Course Title",
        "Topics",
        "Enrollments",
        "Completed",
        "In Progress",
        "Not Started",
        "Inactive 7d",
        "Resources",
        "Students Viewed",
        "Students Downloaded",
        "Avg Progress (%)"
    ];
    const courseRows = lecturer.courses.map((c) => [
        c.course_code,
        c.course_title,
        c.topic_count || 0,
        c.enrollment_count,
        c.completed_count || 0,
        c.in_progress_count || 0,
        c.not_started_count || 0,
        c.inactive_7d || 0,
        c.resource_count,
        c.students_viewed || 0,
        c.students_downloaded || 0,
        formatNumber(c.avg_progress)
    ]);

    let csv = meta
        + rowsToCsv(summaryHeaders, summaryRows)
        + "\r\n\r\n"
        + rowsToCsv(courseHeaders, courseRows);

    (lecturer.courses || []).forEach((course) => {
        const students = course.students || [];
        csv += `\r\n\r\n# ${course.course_code} — enrolled students\r\n`;
        csv += rowsToCsv(
            ["Student Name", "Student ID", "Topics", "Status", "Study Time (min)", "Last Activity"],
            students.map((s) => [
                s.student_name,
                s.student_number || "-",
                `${s.topics_completed}/${s.topics_total}`,
                s.status,
                s.total_study_time,
                formatDate(s.last_activity_at)
            ])
        );
    });

    return csv;
};

const buildStudentListCsv = (students, generatedAt, filterLabel) => {
    const headers = [
        "Student Name",
        "Student ID",
        "Email",
        "Status",
        "Courses Enrolled",
        "Courses Completed",
        "Avg Progress (%)",
        "Total Study Time (min)",
        "Last Activity",
        "Joined Date"
    ];
    const rows = students.map((s) => [
        s.student_name,
        s.student_number || "-",
        s.student_email,
        s.enrollment_status,
        s.courses_enrolled,
        s.courses_completed || 0,
        formatNumber(s.avg_progress),
        s.total_study_time,
        formatDate(s.last_activity_at || s.last_log_date),
        formatDate(s.student_joined)
    ]);
    const meta = `# StudyHub Student Report\r\n# Generated: ${generatedAt}\r\n# Filter: ${filterLabel}\r\n\r\n`;
    return meta + rowsToCsv(headers, rows);
};

const buildStudentDetailCsv = (student, courses, generatedAt) => {
    const meta = [
        `# StudyHub Student Detail Report`,
        `# Generated: ${generatedAt}`,
        `# Student: ${student.student_name}`,
        `# Student ID: ${student.student_number || "-"}`,
        ""
    ].join("\r\n");

    const summaryHeaders = ["Metric", "Value"];
    const summaryRows = [
        ["Email", student.student_email],
        ["Status", student.enrollment_status],
        ["Courses Enrolled", student.courses_enrolled],
        ["Courses Completed", student.courses_completed || 0],
        ["Avg Progress (%)", formatNumber(student.avg_progress)],
        ["Total Study Time (min)", student.total_study_time],
        ["Resources Viewed", student.resources_viewed || 0],
        ["Resources Downloaded", student.resources_downloaded || 0],
        ["Last Activity", formatDate(student.last_activity_at || student.last_log_date)]
    ];

    const courseHeaders = [
        "Course Code",
        "Course Title",
        "Lecturer",
        "Enrolled Date",
        "Topics",
        "Status",
        "Progress (%)",
        "Study Time (min)",
        "Last Activity",
        "Resources Viewed",
        "Resources Downloaded"
    ];
    const courseRows = courses.map((c) => [
        c.course_code,
        c.course_title,
        c.lecturer_name || "-",
        formatDate(c.enrolled_at),
        `${Number(c.topics_completed) || 0}/${Number(c.topics_total) || 0}`,
        c.status || courseStatus(c),
        formatNumber(c.completion_percentage),
        c.total_study_time,
        formatDate(c.last_activity_at),
        `${Number(c.resources_viewed) || 0}/${Number(c.resources_total) || 0}`,
        c.resources_downloaded || 0
    ]);

    let csv = meta
        + rowsToCsv(summaryHeaders, summaryRows)
        + "\r\n\r\n"
        + rowsToCsv(courseHeaders, courseRows);

    courses.forEach((course) => {
        csv += `\r\n\r\n# ${course.course_code} topics\r\n`;
        csv += rowsToCsv(
            ["Topic", "Done", "Date", "Minutes"],
            (course.topics || []).map((t) => [
                t.title,
                t.completed ? "Yes" : "No",
                formatDate(t.log_date),
                t.study_duration || "-"
            ])
        );
    });

    return csv;
};

const drawPdfTable = (doc, headers, rows, startY) => {
    const left = doc.page.margins.left;
    const tableWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const colWidth = tableWidth / headers.length;
    let y = startY;

    doc.font("Helvetica-Bold").fontSize(8);
    headers.forEach((header, i) => {
        doc.text(header, left + i * colWidth, y, {
            width: colWidth - 4,
            lineBreak: false
        });
    });
    y += 16;
    doc.font("Helvetica").fontSize(7.5);

    rows.forEach((row) => {
        if (y > doc.page.height - doc.page.margins.bottom - 40) {
            doc.addPage();
            y = doc.page.margins.top;
        }
        row.forEach((cell, i) => {
            doc.text(String(cell ?? "-"), left + i * colWidth, y, {
                width: colWidth - 4,
                lineBreak: false
            });
        });
        y += 14;
    });

    return y + 10;
};

const streamPdf = (res, filename, build, landscape = false) => {
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    const doc = new PDFDocument({
        margin: 40,
        size: "A4",
        layout: landscape ? "landscape" : "portrait"
    });
    doc.pipe(res);
    build(doc);
    doc.end();
};

const buildLecturerListPdf = (res, filename, lecturers, generatedAt) => {
    streamPdf(res, filename, (doc) => {
        doc.font("Helvetica-Bold").fontSize(16).text("StudyHub — Lecturer Report", { align: "center" });
        doc.moveDown(0.5);
        doc.font("Helvetica").fontSize(10).text(`Generated: ${generatedAt}`, { align: "center" });
        doc.moveDown(1.5);

        drawPdfTable(
            doc,
            ["Name", "Email", "Courses", "No topics", "Students", "Avg %", "Joined"],
            lecturers.map((l) => [
                l.full_name,
                l.email,
                l.course_count,
                l.courses_without_topics || 0,
                l.unique_students || l.total_students,
                formatNumber(l.avg_progress),
                formatDate(l.created_at)
            ]),
            doc.y
        );
    });
};

const buildLecturerDetailPdf = (res, filename, lecturer, generatedAt) => {
    streamPdf(res, filename, (doc) => {
        doc.font("Helvetica-Bold").fontSize(16).text("StudyHub — Lecturer Detail Report");
        doc.moveDown(0.4);
        doc.font("Helvetica").fontSize(10);
        doc.text(`Generated: ${generatedAt}`);
        doc.text(`Lecturer: ${lecturer.full_name}`);
        doc.text(`Email: ${lecturer.email}`);
        doc.moveDown(0.6);
        doc.text(`Courses taught: ${lecturer.course_count}  ·  Without topics: ${lecturer.courses_without_topics || 0}`);
        doc.text(`Unique students: ${lecturer.unique_students || 0}  ·  Enrolment seats: ${lecturer.total_students}`);
        doc.text(`Topics defined: ${lecturer.topics_defined || 0}  ·  Resources: ${lecturer.resources_uploaded || 0}`);
        doc.text(`Completed: ${lecturer.students_completed || 0}  ·  In progress: ${lecturer.students_in_progress || 0}  ·  Avg: ${formatNumber(lecturer.avg_progress)}%`);
        doc.moveDown(0.8);

        drawPdfTable(
            doc,
            ["Code", "Title", "Topics", "Enr.", "Done", "Prog.", "NS", "Idle 7d", "Viewed", "DL", "Avg %"],
            lecturer.courses.map((c) => [
                c.course_code,
                c.course_title,
                c.topic_count || 0,
                c.enrollment_count,
                c.completed_count || 0,
                c.in_progress_count || 0,
                c.not_started_count || 0,
                c.inactive_7d || 0,
                c.students_viewed || 0,
                c.students_downloaded || 0,
                formatNumber(c.avg_progress)
            ]),
            doc.y
        );

        (lecturer.courses || []).forEach((course) => {
            const students = course.students || [];
            if (doc.y > doc.page.height - 120) doc.addPage();
            doc.moveDown(0.6);
            doc.font("Helvetica-Bold").fontSize(11).text(`${course.course_code} — enrolled students`);
            doc.moveDown(0.3);
            if (students.length === 0) {
                doc.font("Helvetica").fontSize(9).text("No students enrolled.");
                return;
            }
            drawPdfTable(
                doc,
                ["Name", "Student ID", "Topics", "Status", "Minutes", "Last activity"],
                students.map((s) => [
                    s.student_name,
                    s.student_number || "-",
                    `${s.topics_completed}/${s.topics_total}`,
                    s.status,
                    s.total_study_time,
                    formatDate(s.last_activity_at)
                ]),
                doc.y
            );
        });
    }, true);
};

const buildStudentListPdf = (res, filename, students, generatedAt, filterLabel) => {
    streamPdf(res, filename, (doc) => {
        doc.font("Helvetica-Bold").fontSize(16).text("StudyHub — Student Report", { align: "center" });
        doc.moveDown(0.5);
        doc.font("Helvetica").fontSize(10).text(`Generated: ${generatedAt}`, { align: "center" });
        doc.text(`Filter: ${filterLabel}`, { align: "center" });
        doc.moveDown(1.5);

        drawPdfTable(
            doc,
            ["Name", "ID", "Status", "Courses", "Done", "Avg %", "Minutes", "Last activity"],
            students.map((s) => [
                s.student_name,
                s.student_number || "-",
                s.enrollment_status,
                s.courses_enrolled,
                s.courses_completed || 0,
                formatNumber(s.avg_progress),
                s.total_study_time,
                formatDate(s.last_activity_at || s.last_log_date)
            ]),
            doc.y
        );
    });
};

const buildStudentDetailPdf = (res, filename, student, courses, generatedAt) => {
    streamPdf(res, filename, (doc) => {
        doc.font("Helvetica-Bold").fontSize(16).text("StudyHub — Student Detail Report");
        doc.moveDown(0.4);
        doc.font("Helvetica").fontSize(10);
        doc.text(`Generated: ${generatedAt}`);
        doc.text(`Student: ${student.student_name}`);
        doc.text(`Student ID: ${student.student_number || "-"}`);
        doc.text(`Email: ${student.student_email}`);
        doc.text(`Status: ${student.enrollment_status}`);
        doc.moveDown(0.5);
        doc.text(`Courses enrolled: ${student.courses_enrolled}  ·  Completed: ${student.courses_completed || 0}`);
        doc.text(`Avg progress: ${formatNumber(student.avg_progress)}%  ·  Study time: ${student.total_study_time} min`);
        doc.text(`Resources viewed: ${student.resources_viewed || 0}  ·  Downloaded: ${student.resources_downloaded || 0}`);
        doc.text(`Last activity: ${formatDate(student.last_activity_at || student.last_log_date)}`);
        doc.moveDown(0.8);

        if (courses.length === 0) {
            doc.text("No course enrolments recorded.");
            return;
        }

        drawPdfTable(
            doc,
            ["Code", "Title", "Lecturer", "Topics", "Status", "Avg %", "Minutes", "Viewed", "Last activity"],
            courses.map((c) => [
                c.course_code,
                c.course_title,
                c.lecturer_name || "-",
                `${Number(c.topics_completed) || 0}/${Number(c.topics_total) || 0}`,
                c.status || courseStatus(c),
                formatNumber(c.completion_percentage),
                c.total_study_time,
                `${Number(c.resources_viewed) || 0}/${Number(c.resources_total) || 0}`,
                formatDate(c.last_activity_at)
            ]),
            doc.y
        );

        courses.forEach((course) => {
            const topics = course.topics || [];
            if (doc.y > doc.page.height - 100) doc.addPage();
            doc.moveDown(0.5);
            doc.font("Helvetica-Bold").fontSize(11).text(`${course.course_code} topics`);
            doc.moveDown(0.2);
            if (topics.length === 0) {
                doc.font("Helvetica").fontSize(9).text("No topics defined for this course.");
                return;
            }
            drawPdfTable(
                doc,
                ["Topic", "Done", "Date", "Minutes"],
                topics.map((t) => [
                    t.title,
                    t.completed ? "Yes" : "No",
                    formatDate(t.log_date),
                    t.study_duration || "-"
                ]),
                doc.y
            );
        });
    }, true);
};

module.exports = {
    aggregateLecturerReports,
    attachStudentsToLecturer,
    attachTopicsToCourses,
    courseStatus,
    escapeCsv,
    rowsToCsv,
    formatDate,
    formatNumber,
    buildLecturerListCsv,
    buildLecturerDetailCsv,
    buildStudentListCsv,
    buildStudentDetailCsv,
    buildLecturerListPdf,
    buildLecturerDetailPdf,
    buildStudentListPdf,
    buildStudentDetailPdf
};
