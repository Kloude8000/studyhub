import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import AppShell from "../../components/layout/AppShell";
import Badge from "../../components/ui/Badge";
import Spinner from "../../components/ui/Spinner";
import Button from "../../components/ui/Button";
import Tabs from "../../components/ui/Tabs";
import Pagination from "../../components/ui/Pagination";
import { Field, TextInput } from "../../components/ui/Input";
import { getCourses } from "../../api/courses";
import {
    exportLecturerReports,
    exportStudentReports,
    getLecturerReports,
    getStudentReportDetail,
    getStudentReports
} from "../../api/reports";
import { downloadBlob } from "../../utils/downloads";
import { useListControls } from "../../hooks/useListControls";
import { useToast } from "../../context/ToastContext";
import { getErrorMessage } from "../../api/client";
import { adminNav } from "./adminNav";
import styles from "./AdminReportsPage.module.css";

const REPORT_TABS = [
    { id: "lecturers", label: "Lecturers" },
    { id: "students", label: "Students" }
];

const STUDENT_SORT = {
    name: (a, b) => a.full_name.localeCompare(b.full_name),
    progress: (a, b) => Number(b.avg_progress) - Number(a.avg_progress),
    study: (a, b) => Number(b.total_study_time) - Number(a.total_study_time),
    courses: (a, b) => Number(b.enrollment_count) - Number(a.enrollment_count)
};

const LECTURER_SORT = {
    name: (a, b) => a.full_name.localeCompare(b.full_name),
    courses: (a, b) => Number(b.courses_taught) - Number(a.courses_taught),
    students: (a, b) => Number(b.total_students) - Number(a.total_students)
};

const formatDate = (value) => {
    if (!value) {
        return "—";
    }

    return new Date(value).toLocaleDateString();
};

const isAtRisk = (row) => {
    if (Number(row.enrollment_count) === 0) {
        return false;
    }

    if (Number(row.avg_progress) < 25) {
        return true;
    }

    if (!row.last_log_date) {
        return true;
    }

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 14);
    return new Date(row.last_log_date) < cutoff;
};

export default function AdminReportsPage() {
    const { showToast } = useToast();
    const [tab, setTab] = useState("students");
    const [status, setStatus] = useState("all");
    const [courseId, setCourseId] = useState("");
    const [search, setSearch] = useState("");
    const [exporting, setExporting] = useState(null);
    const [detailStudentId, setDetailStudentId] = useState(null);

    const coursesQuery = useQuery({
        queryKey: ["courses"],
        queryFn: async () => (await getCourses()).data
    });

    const studentReportsQuery = useQuery({
        queryKey: ["admin-student-reports", status, courseId],
        queryFn: async () =>
            (
                await getStudentReports({
                    status,
                    ...(courseId ? { courseId } : {})
                })
            ).data,
        enabled: tab === "students"
    });

    const lecturerReportsQuery = useQuery({
        queryKey: ["admin-lecturer-reports"],
        queryFn: async () => (await getLecturerReports()).data,
        enabled: tab === "lecturers"
    });

    const detailQuery = useQuery({
        queryKey: ["admin-student-detail", detailStudentId],
        queryFn: async () =>
            (await getStudentReportDetail(detailStudentId)).data,
        enabled: Boolean(detailStudentId)
    });

    const studentRows = useMemo(() => {
        const query = search.trim().toLowerCase();
        const rows = studentReportsQuery.data?.rows || [];

        if (!query) {
            return rows;
        }

        return rows.filter((row) =>
            [row.full_name, row.email, String(row.user_id)]
                .some((value) => String(value).toLowerCase().includes(query))
        );
    }, [studentReportsQuery.data, search]);

    const lecturerRows = useMemo(() => {
        const query = search.trim().toLowerCase();
        const rows = lecturerReportsQuery.data?.rows || [];

        if (!query) {
            return rows;
        }

        return rows.filter((row) =>
            [row.full_name, row.email]
                .some((value) => String(value).toLowerCase().includes(query))
        );
    }, [lecturerReportsQuery.data, search]);

    const studentControls = useListControls(studentRows, {
        defaultSort: "name",
        sortOptions: STUDENT_SORT,
        pageSize: 10
    });

    const lecturerControls = useListControls(lecturerRows, {
        defaultSort: "name",
        sortOptions: LECTURER_SORT,
        pageSize: 10
    });

    const generatedAt =
        tab === "students"
            ? studentReportsQuery.data?.generated_at
            : lecturerReportsQuery.data?.generated_at;

    const summaryCount =
        tab === "students" ? studentRows.length : lecturerRows.length;

    const enrolledCount = studentRows.filter(
        (row) => Number(row.enrollment_count) > 0
    ).length;

    const atRiskCount = studentRows.filter((row) => isAtRisk(row)).length;

    const avgProgress = studentRows.length
        ? Math.round(
            studentRows.reduce(
                (sum, row) => sum + Number(row.avg_progress || 0),
                0
            ) / studentRows.length
        )
        : 0;

    const handleTabChange = (nextTab) => {
        setTab(nextTab);
        setSearch("");
        setDetailStudentId(null);
        studentControls.resetPage();
        lecturerControls.resetPage();
    };

    const handleExport = async (format) => {
        setExporting(format);

        try {
            if (tab === "students") {
                const response = await exportStudentReports(format, {
                    status,
                    ...(courseId ? { courseId } : {})
                });
                downloadBlob(response.data, `studyhub-students-report.${format}`);
            } else {
                const response = await exportLecturerReports(format);
                downloadBlob(
                    response.data,
                    `studyhub-lecturers-report.${format}`
                );
            }
        } catch (err) {
            showToast(getErrorMessage(err), "error");
        } finally {
            setExporting(null);
        }
    };

    const isLoading =
        tab === "students"
            ? studentReportsQuery.isLoading
            : lecturerReportsQuery.isLoading;

    return (
        <AppShell title="Reports" navItems={adminNav}>
            <div className="stack">
                <div className="row" style={{ justifyContent: "space-between" }}>
                    <div>
                        <h1 className="page-title">Reports</h1>
                        <p className="page-subtitle">
                            Analyze student engagement and lecturer workload, then export results.
                        </p>
                    </div>
                    <div className="row">
                        <Button
                            small
                            variant="secondary"
                            disabled={exporting === "csv"}
                            onClick={() => handleExport("csv")}
                        >
                            {exporting === "csv" ? "Exporting…" : "Export CSV"}
                        </Button>
                        <Button
                            small
                            variant="secondary"
                            disabled={exporting === "pdf"}
                            onClick={() => handleExport("pdf")}
                        >
                            {exporting === "pdf" ? "Exporting…" : "Export PDF"}
                        </Button>
                    </div>
                </div>

                <Tabs
                    tabs={REPORT_TABS}
                    activeTab={tab}
                    onChange={handleTabChange}
                />

                {tab === "students" && (
                    <div className={styles.filters}>
                        <Field label="Student filter" htmlFor="student_status">
                            <select
                                id="student_status"
                                value={status}
                                onChange={(event) => {
                                    const nextStatus = event.target.value;
                                    setStatus(nextStatus);
                                    if (nextStatus === "unenrolled") {
                                        setCourseId("");
                                    }
                                    studentControls.resetPage();
                                }}
                            >
                                <option value="all">All students</option>
                                <option value="enrolled">Enrolled</option>
                                <option value="unenrolled">Unenrolled</option>
                            </select>
                        </Field>

                        <Field label="Course (optional)" htmlFor="report_course">
                            <select
                                id="report_course"
                                value={courseId}
                                disabled={status === "unenrolled"}
                                onChange={(event) => {
                                    setCourseId(event.target.value);
                                    studentControls.resetPage();
                                }}
                            >
                                <option value="">All courses</option>
                                {(coursesQuery.data || []).map((course) => (
                                    <option
                                        key={course.course_id}
                                        value={course.course_id}
                                    >
                                        {course.course_code} — {course.course_title}
                                    </option>
                                ))}
                            </select>
                        </Field>

                        <Field label="Search" htmlFor="report_search">
                            <TextInput
                                id="report_search"
                                value={search}
                                onChange={(event) => {
                                    setSearch(event.target.value);
                                    studentControls.resetPage();
                                }}
                                placeholder="Search by name, email, or ID"
                            />
                        </Field>

                        <Field label="Sort by" htmlFor="student_sort">
                            <select
                                id="student_sort"
                                value={studentControls.sortBy}
                                onChange={(event) => {
                                    studentControls.setSortBy(event.target.value);
                                    studentControls.resetPage();
                                }}
                            >
                                <option value="name">Name</option>
                                <option value="progress">Avg progress</option>
                                <option value="study">Study time</option>
                                <option value="courses">Courses</option>
                            </select>
                        </Field>
                    </div>
                )}

                {tab === "lecturers" && (
                    <div className={styles.filters}>
                        <Field label="Search" htmlFor="lecturer_search">
                            <TextInput
                                id="lecturer_search"
                                value={search}
                                onChange={(event) => {
                                    setSearch(event.target.value);
                                    lecturerControls.resetPage();
                                }}
                                placeholder="Search by name or email"
                            />
                        </Field>

                        <Field label="Sort by" htmlFor="lecturer_sort">
                            <select
                                id="lecturer_sort"
                                value={lecturerControls.sortBy}
                                onChange={(event) => {
                                    lecturerControls.setSortBy(event.target.value);
                                    lecturerControls.resetPage();
                                }}
                            >
                                <option value="name">Name</option>
                                <option value="courses">Courses taught</option>
                                <option value="students">Total students</option>
                            </select>
                        </Field>
                    </div>
                )}

                <div className={styles.summary}>
                    <p className="muted">
                        <strong>{summaryCount}</strong>{" "}
                        {tab === "students" ? "student(s)" : "lecturer(s)"}
                        {generatedAt
                            ? ` — generated ${new Date(generatedAt).toLocaleString()}`
                            : ""}
                    </p>

                    {tab === "students" && (
                        <div className="row">
                            <Badge tone="success">{enrolledCount} enrolled</Badge>
                            <Badge tone="neutral">
                                {summaryCount - enrolledCount} unenrolled
                            </Badge>
                            <Badge tone="warning">{atRiskCount} at risk</Badge>
                            <Badge>Avg {avgProgress}%</Badge>
                        </div>
                    )}
                </div>

                {isLoading && <Spinner />}

                {!isLoading && tab === "students" && studentRows.length === 0 && (
                    <div className="empty-state">
                        <p>No students match the current filters.</p>
                    </div>
                )}

                {!isLoading && tab === "lecturers" && lecturerRows.length === 0 && (
                    <div className="empty-state">
                        <p>No lecturers found.</p>
                    </div>
                )}

                {!isLoading && tab === "students" && studentRows.length > 0 && (
                    <>
                        <div className={styles.tableWrap}>
                            <table className={styles.table}>
                                <thead>
                                    <tr>
                                        <th>Name</th>
                                        <th>Student ID</th>
                                        <th>Status</th>
                                        <th>Courses</th>
                                        <th>Avg Progress</th>
                                        <th>Study Time</th>
                                        <th>Last Log</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {studentControls.paginatedItems.map((row) => (
                                        <tr key={row.user_id}>
                                            <td>
                                                <strong>{row.full_name}</strong>
                                                <p className="muted">{row.email}</p>
                                            </td>
                                            <td>{row.user_id}</td>
                                            <td>
                                                <div className="row">
                                                    <Badge
                                                        tone={
                                                            row.status === "Enrolled"
                                                                ? "success"
                                                                : "neutral"
                                                        }
                                                    >
                                                        {row.status}
                                                    </Badge>
                                                    {isAtRisk(row) && (
                                                        <Badge tone="warning">At risk</Badge>
                                                    )}
                                                </div>
                                            </td>
                                            <td>{row.enrollment_count}</td>
                                            <td>{Number(row.avg_progress).toFixed(1)}%</td>
                                            <td>{row.total_study_time} min</td>
                                            <td>{formatDate(row.last_log_date)}</td>
                                            <td>
                                                <Button
                                                    small
                                                    variant="secondary"
                                                    onClick={() =>
                                                        setDetailStudentId(row.user_id)
                                                    }
                                                >
                                                    View detail
                                                </Button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <Pagination
                            page={studentControls.page}
                            totalPages={studentControls.totalPages}
                            totalItems={studentControls.totalItems}
                            onPageChange={studentControls.setPage}
                        />
                    </>
                )}

                {!isLoading && tab === "lecturers" && lecturerRows.length > 0 && (
                    <>
                        <div className={styles.tableWrap}>
                            <table className={styles.table}>
                                <thead>
                                    <tr>
                                        <th>Name</th>
                                        <th>Email</th>
                                        <th>Courses Taught</th>
                                        <th>Total Students</th>
                                        <th>Avg Student Progress</th>
                                        <th>Joined</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {lecturerControls.paginatedItems.map((row) => (
                                        <tr key={row.user_id}>
                                            <td>
                                                <strong>{row.full_name}</strong>
                                            </td>
                                            <td>{row.email}</td>
                                            <td>{row.courses_taught}</td>
                                            <td>{row.total_students}</td>
                                            <td>
                                                {Number(row.avg_student_progress).toFixed(1)}%
                                            </td>
                                            <td>{formatDate(row.created_at)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <Pagination
                            page={lecturerControls.page}
                            totalPages={lecturerControls.totalPages}
                            totalItems={lecturerControls.totalItems}
                            onPageChange={lecturerControls.setPage}
                        />
                    </>
                )}

                {detailStudentId && (
                    <div className={styles.detailPanel}>
                        <div className={styles.detailHeader}>
                            <div>
                                <h2 className="section-title">Student detail</h2>
                                {detailQuery.data && (
                                    <p className="muted">
                                        {detailQuery.data.student.full_name} ·{" "}
                                        {detailQuery.data.student.email}
                                    </p>
                                )}
                            </div>
                            <Button
                                small
                                variant="secondary"
                                onClick={() => setDetailStudentId(null)}
                            >
                                Close
                            </Button>
                        </div>

                        {detailQuery.isLoading && <Spinner />}

                        {detailQuery.data && (
                            <div className="stack">
                                <div>
                                    <h3 className="section-title">Enrollments</h3>
                                    {detailQuery.data.enrollments.length === 0 ? (
                                        <p className="muted">No enrollments.</p>
                                    ) : (
                                        <div className="stack">
                                            {detailQuery.data.enrollments.map((item) => (
                                                <div key={item.enrollment_id} className="row">
                                                    <div>
                                                        <strong>{item.course_title}</strong>
                                                        <p className="muted">
                                                            {item.course_code} · {item.lecturer_name}
                                                        </p>
                                                    </div>
                                                    <Badge>
                                                        {item.completion_percentage}% ·{" "}
                                                        {item.total_study_time} min
                                                    </Badge>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <div>
                                    <h3 className="section-title">Recent journal entries</h3>
                                    {detailQuery.data.recent_logs.length === 0 ? (
                                        <p className="muted">No journal entries.</p>
                                    ) : (
                                        <div className="stack">
                                            {detailQuery.data.recent_logs.map((log) => (
                                                <div key={log.log_id}>
                                                    <strong>{log.topic}</strong>
                                                    <p className="muted">
                                                        {log.course_code} · {formatDate(log.log_date)} ·{" "}
                                                        {log.study_duration} min
                                                    </p>
                                                    {log.notes && <p>{log.notes}</p>}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </AppShell>
    );
}
