import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import AppShell from "../../components/layout/AppShell";
import Card from "../../components/ui/Card";
import Badge from "../../components/ui/Badge";
import Spinner from "../../components/ui/Spinner";
import Button from "../../components/ui/Button";
import { Field, TextInput } from "../../components/ui/Input";
import { getMyCourses } from "../../api/courses";
import { adminNav } from "./adminNav";

export default function AdminCoursesPage() {
    const [search, setSearch] = useState("");
    const { data, isLoading } = useQuery({
        queryKey: ["admin-courses"],
        queryFn: async () => (await getMyCourses()).data
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

    return (
        <AppShell title="All courses" navItems={adminNav}>
            <div className="stack">
                <div>
                    <h1 className="page-title">All courses</h1>
                    <p className="page-subtitle">
                        Full course catalog across the platform.
                    </p>
                </div>

                <Field label="Search courses" htmlFor="admin_course_search">
                    <TextInput
                        id="admin_course_search"
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        placeholder="Search by title, code, lecturer, or description"
                    />
                </Field>

                {isLoading && <Spinner />}

                {!isLoading && filteredCourses.length === 0 && (
                    <div className="empty-state">
                        <p>
                            {search
                                ? "No courses match your search."
                                : "No courses have been created yet."}
                        </p>
                    </div>
                )}

                <div className="grid grid-2">
                    {filteredCourses.map((course) => (
                        <Card
                            key={course.course_id}
                            title={course.course_title}
                            action={<Badge>{course.course_code}</Badge>}
                        >
                            <p className="muted">{course.description}</p>
                            <p className="muted">Lecturer: {course.lecturer_name || "—"}</p>
                            <Link to={`/admin/courses/${course.course_id}`}>
                                <Button small variant="secondary">
                                    Manage course
                                </Button>
                            </Link>
                        </Card>
                    ))}
                </div>
            </div>
        </AppShell>
    );
}
