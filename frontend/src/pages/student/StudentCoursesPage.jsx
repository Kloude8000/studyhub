import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import AppShell from "../../components/layout/AppShell";
import Card from "../../components/ui/Card";
import Badge from "../../components/ui/Badge";
import Spinner from "../../components/ui/Spinner";
import Alert from "../../components/ui/Alert";
import Pagination from "../../components/ui/Pagination";
import { Field, TextInput } from "../../components/ui/Input";
import { getCourses } from "../../api/courses";
import { getErrorMessage } from "../../api/client";
import { useListControls } from "../../hooks/useListControls";
import { studentNav } from "./studentNav";

const SORT_OPTIONS = {
    title: (a, b) => a.course_title.localeCompare(b.course_title),
    code: (a, b) => a.course_code.localeCompare(b.course_code),
    lecturer: (a, b) => (a.lecturer_name || "").localeCompare(b.lecturer_name || "")
};

export default function StudentCoursesPage() {
    const [search, setSearch] = useState("");

    const { data, isLoading, error } = useQuery({
        queryKey: ["courses"],
        queryFn: async () => (await getCourses()).data
    });

    const filteredCourses = useMemo(() => {
        const query = search.trim().toLowerCase();

        if (!query) {
            return data || [];
        }

        return (data || []).filter((course) =>
            [
                course.course_title,
                course.course_code,
                course.description,
                course.lecturer_name
            ]
                .filter(Boolean)
                .some((value) => String(value).toLowerCase().includes(query))
        );
    }, [data, search]);

    const {
        paginatedItems,
        page,
        setPage,
        sortBy,
        setSortBy,
        totalPages,
        totalItems,
        resetPage
    } = useListControls(filteredCourses, {
        sortOptions: SORT_OPTIONS
    });

    return (
        <AppShell title="Browse courses" navItems={studentNav}>
            <div className="stack">
                <div>
                    <h1 className="page-title">Course catalog</h1>
                    <p className="page-subtitle">
                        Explore available courses and enroll to unlock resources and progress tracking.
                    </p>
                </div>

                <div className="row">
                    <Field label="Search courses" htmlFor="student_course_search">
                        <TextInput
                            id="student_course_search"
                            value={search}
                            onChange={(event) => {
                                setSearch(event.target.value);
                                resetPage();
                            }}
                            placeholder="Search by title, code, lecturer, or description"
                        />
                    </Field>

                    <Field label="Sort by" htmlFor="student_course_sort">
                        <select
                            id="student_course_sort"
                            value={sortBy}
                            onChange={(event) => {
                                setSortBy(event.target.value);
                                resetPage();
                            }}
                        >
                            <option value="title">Title</option>
                            <option value="code">Course code</option>
                            <option value="lecturer">Lecturer</option>
                        </select>
                    </Field>
                </div>

                {isLoading && <Spinner />}
                {error && <Alert tone="error">{getErrorMessage(error)}</Alert>}

                {!isLoading && !error && filteredCourses.length === 0 && (
                    <div className="empty-state">
                        <p>
                            {search
                                ? "No courses match your search."
                                : "No courses are available yet."}
                        </p>
                    </div>
                )}

                <div className="grid grid-2">
                    {paginatedItems.map((course) => (
                        <Card
                            key={course.course_id}
                            title={course.course_title}
                            action={<Badge>{course.course_code}</Badge>}
                            interactive
                        >
                            <p className="muted">{course.description}</p>
                            <p className="muted">Lecturer: {course.lecturer_name}</p>
                            <Link to={`/student/courses/${course.course_id}`}>
                                View course
                            </Link>
                        </Card>
                    ))}
                </div>

                <Pagination
                    page={page}
                    totalPages={totalPages}
                    totalItems={totalItems}
                    onPageChange={setPage}
                />
            </div>
        </AppShell>
    );
}
