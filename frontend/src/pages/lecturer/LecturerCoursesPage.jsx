import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import AppShell from "../../components/layout/AppShell";
import Card from "../../components/ui/Card";
import Badge from "../../components/ui/Badge";
import Spinner from "../../components/ui/Spinner";
import Alert from "../../components/ui/Alert";
import { getMyCourses } from "../../api/courses";
import { getErrorMessage } from "../../api/client";
import { lecturerNav } from "./lecturerNav";

export default function LecturerCoursesPage() {
    const { data, isLoading, error } = useQuery({
        queryKey: ["lecturer-courses"],
        queryFn: async () => (await getMyCourses()).data
    });

    return (
        <AppShell title="My courses" navItems={lecturerNav}>
            <div className="stack">
                <div className="row">
                    <div>
                        <h1 className="page-title">My courses</h1>
                        <p className="page-subtitle">
                            Courses you own and manage.
                        </p>
                    </div>
                    <Link to="/lecturer/courses/new">Create course</Link>
                </div>

                {isLoading && <Spinner />}
                {error && <Alert tone="error">{getErrorMessage(error)}</Alert>}

                {!isLoading && !error && data?.length === 0 && (
                    <div className="empty-state">
                        <p>You have not created any courses yet.</p>
                    </div>
                )}

                <div className="grid grid-2">
                    {(data || []).map((course) => (
                        <Card
                            key={course.course_id}
                            title={course.course_title}
                            action={<Badge>{course.course_code}</Badge>}
                        >
                            <p className="muted">{course.description}</p>
                            <Link to={`/lecturer/courses/${course.course_id}`}>
                                Manage course
                            </Link>
                        </Card>
                    ))}
                </div>
            </div>
        </AppShell>
    );
}
