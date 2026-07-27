import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import AppShell from "../../components/layout/AppShell";
import Card from "../../components/ui/Card";
import Badge from "../../components/ui/Badge";
import Spinner from "../../components/ui/Spinner";
import Button from "../../components/ui/Button";
import Tabs from "../../components/ui/Tabs";
import Pagination from "../../components/ui/Pagination";
import { Field, TextInput } from "../../components/ui/Input";
import { getCourses } from "../../api/courses";
import {
    getUserCategoryCounts,
    getUsers,
    exportUsersReport
} from "../../api/reports";
import { downloadBlob } from "../../utils/downloads";
import { useListControls } from "../../hooks/useListControls";
import { useToast } from "../../context/ToastContext";
import { getErrorMessage } from "../../api/client";
import { adminNav } from "./adminNav";
import styles from "./AdminReportsPage.module.css";

const CATEGORIES = [
    { id: "lecturers", label: "Lecturers" },
    { id: "students_by_course", label: "Students by Course" },
    { id: "not_enrolled", label: "Not Enrolled" },
    { id: "admins", label: "Administrators" }
];

const SORT_OPTIONS = {
    name: (a, b) => a.full_name.localeCompare(b.full_name),
    email: (a, b) => a.email.localeCompare(b.email),
    joined: (a, b) => new Date(b.created_at) - new Date(a.created_at)
};

export default function AdminUsersPage() {
    const { showToast } = useToast();
    const [category, setCategory] = useState(null);
    const [courseId, setCourseId] = useState("");
    const [search, setSearch] = useState("");
    const [exporting, setExporting] = useState(null);

    const countsQuery = useQuery({
        queryKey: ["admin-user-counts"],
        queryFn: async () => (await getUserCategoryCounts()).data
    });

    const coursesQuery = useQuery({
        queryKey: ["courses"],
        queryFn: async () => (await getCourses()).data,
        enabled: category === "students_by_course"
    });

    const canFetchUsers =
        Boolean(category)
        && (category !== "students_by_course" || Boolean(courseId));

    const usersQuery = useQuery({
        queryKey: ["admin-users", category, courseId],
        queryFn: async () =>
            (
                await getUsers({
                    category,
                    ...(category === "students_by_course"
                        ? { courseId }
                        : {})
                })
            ).data,
        enabled: canFetchUsers
    });

    const filteredUsers = useMemo(() => {
        const query = search.trim().toLowerCase();
        const list = usersQuery.data || [];

        if (!query) {
            return list;
        }

        return list.filter((user) =>
            [user.full_name, user.email, user.course_title, user.course_code]
                .filter(Boolean)
                .some((value) => String(value).toLowerCase().includes(query))
        );
    }, [usersQuery.data, search]);

    const {
        paginatedItems,
        page,
        setPage,
        sortBy,
        setSortBy,
        totalPages,
        totalItems,
        resetPage
    } = useListControls(filteredUsers, {
        sortOptions: SORT_OPTIONS
    });

    const counts = countsQuery.data || {};

    const categoryTabs = CATEGORIES.map((item) => {
        let countLabel = "";

        if (item.id === "lecturers") {
            countLabel = ` (${counts.lecturers ?? 0})`;
        } else if (item.id === "admins") {
            countLabel = ` (${counts.admins ?? 0})`;
        } else if (item.id === "not_enrolled") {
            countLabel = ` (${counts.not_enrolled ?? 0})`;
        }

        return {
            id: item.id,
            label: `${item.label}${countLabel}`
        };
    });

    const handleCategoryChange = (nextCategory) => {
        setCategory(nextCategory);
        setSearch("");
        setCourseId("");
        resetPage();
    };

    const handleExport = async (format) => {
        if (!category) {
            showToast("Choose a category first.", "error");
            return;
        }

        if (category === "students_by_course" && !courseId) {
            showToast("Select a course before exporting.", "error");
            return;
        }

        setExporting(format);

        try {
            const response = await exportUsersReport(format, {
                category,
                ...(category === "students_by_course" ? { courseId } : {})
            });
            downloadBlob(response.data, `studyhub-${category}.${format}`);
        } catch (err) {
            showToast(getErrorMessage(err), "error");
        } finally {
            setExporting(null);
        }
    };

    return (
        <AppShell title="Users" navItems={adminNav}>
            <div className="stack">
                <div className="row" style={{ justifyContent: "space-between" }}>
                    <div>
                        <h1 className="page-title">User management</h1>
                        <p className="page-subtitle">
                            Browse lecturers, students, and administrators by category.
                        </p>
                    </div>
                    <Link to="/admin/lecturers/new">
                        <Button>+ Create Lecturer</Button>
                    </Link>
                </div>

                <Tabs
                    tabs={categoryTabs}
                    activeTab={category || ""}
                    onChange={handleCategoryChange}
                />

                {category === "students_by_course" && (
                    <Field label="Course" htmlFor="users_course">
                        <select
                            id="users_course"
                            value={courseId}
                            onChange={(event) => {
                                setCourseId(event.target.value);
                                setSearch("");
                                resetPage();
                            }}
                        >
                            <option value="">Select a course…</option>
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
                )}

                {category && (
                    <div className={styles.filters}>
                        <Field label="Search within category" htmlFor="user_search">
                            <TextInput
                                id="user_search"
                                value={search}
                                onChange={(event) => {
                                    setSearch(event.target.value);
                                    resetPage();
                                }}
                                placeholder="Search within the selected category…"
                                disabled={
                                    category === "students_by_course" && !courseId
                                }
                            />
                        </Field>

                        <Field label="Sort by" htmlFor="user_sort">
                            <select
                                id="user_sort"
                                value={sortBy}
                                onChange={(event) => {
                                    setSortBy(event.target.value);
                                    resetPage();
                                }}
                                disabled={!canFetchUsers}
                            >
                                <option value="name">Name</option>
                                <option value="email">Email</option>
                                <option value="joined">Recently joined</option>
                            </select>
                        </Field>
                    </div>
                )}

                {category && (
                    <div className="row">
                        <Button
                            small
                            variant="secondary"
                            disabled={!canFetchUsers || exporting === "csv"}
                            onClick={() => handleExport("csv")}
                        >
                            {exporting === "csv" ? "Exporting…" : "Export CSV"}
                        </Button>
                        <Button
                            small
                            variant="secondary"
                            disabled={!canFetchUsers || exporting === "pdf"}
                            onClick={() => handleExport("pdf")}
                        >
                            {exporting === "pdf" ? "Exporting…" : "Export PDF"}
                        </Button>
                    </div>
                )}

                {!category && (
                    <div className="empty-state">
                        <p>Choose a category above to load users.</p>
                    </div>
                )}

                {category === "students_by_course" && !courseId && (
                    <div className="empty-state">
                        <p>Select a course to view enrolled students.</p>
                    </div>
                )}

                {canFetchUsers && usersQuery.isLoading && <Spinner />}

                {canFetchUsers && !usersQuery.isLoading && filteredUsers.length === 0 && (
                    <div className="empty-state">
                        <p>
                            {search
                                ? "No users match your search."
                                : "No users in this category."}
                        </p>
                    </div>
                )}

                {canFetchUsers && !usersQuery.isLoading && filteredUsers.length > 0 && (
                    <>
                        <div className={styles.tableWrap}>
                            <table className={styles.table}>
                                <thead>
                                    <tr>
                                        <th>Name</th>
                                        <th>Email</th>
                                        <th>Details</th>
                                        <th>Joined</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {paginatedItems.map((user) => (
                                        <tr key={`${user.user_id}-${user.enrollment_id || ""}`}>
                                            <td>
                                                <strong>{user.full_name}</strong>
                                            </td>
                                            <td>{user.email}</td>
                                            <td>
                                                {category === "lecturers" && (
                                                    <span className="muted">
                                                        {user.courses_taught || 0} courses ·{" "}
                                                        {user.total_students || 0} students
                                                    </span>
                                                )}
                                                {category === "students_by_course" && (
                                                    <span className="muted">
                                                        {user.completion_percentage || 0}% ·{" "}
                                                        {user.total_study_time || 0} min
                                                    </span>
                                                )}
                                                {category === "not_enrolled" && (
                                                    <Badge tone="warning">Not enrolled</Badge>
                                                )}
                                                {category === "admins" && (
                                                    <Badge tone="neutral">Admin</Badge>
                                                )}
                                            </td>
                                            <td>
                                                {user.created_at
                                                    ? new Date(
                                                        user.created_at
                                                    ).toLocaleDateString()
                                                    : "—"}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <Pagination
                            page={page}
                            totalPages={totalPages}
                            totalItems={totalItems}
                            onPageChange={setPage}
                        />
                    </>
                )}

                {category === "lecturers" && (
                    <Card title="Quick action">
                        <Link to="/admin/lecturers/new">
                            Create another lecturer account
                        </Link>
                    </Card>
                )}
            </div>
        </AppShell>
    );
}
