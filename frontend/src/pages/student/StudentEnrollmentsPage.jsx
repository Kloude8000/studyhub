import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import AppShell from "../../components/layout/AppShell";
import Card from "../../components/ui/Card";
import Badge from "../../components/ui/Badge";
import Spinner from "../../components/ui/Spinner";
import Alert from "../../components/ui/Alert";
import { getMyEnrollments } from "../../api/enrollments";
import { getErrorMessage } from "../../api/client";
import { studentNav } from "./studentNav";

export default function StudentEnrollmentsPage() {
    const { data, isLoading, error } = useQuery({
        queryKey: ["student-enrollments"],
        queryFn: async () => (await getMyEnrollments()).data
    });

    return (
        <AppShell title="My enrollments" navItems={studentNav}>
            <div className="stack">
                <div>
                    <h1 className="page-title">My enrollments</h1>
                    <p className="page-subtitle">
                        Courses you are currently enrolled in.
                    </p>
                </div>

                {isLoading && <Spinner />}
                {error && <Alert tone="error">{getErrorMessage(error)}</Alert>}

                {!isLoading && !error && data?.length === 0 && (
                    <div className="empty-state">
                        <p>No enrollments yet.</p>
                        <Link to="/student/courses">Browse courses</Link>
                    </div>
                )}

                <div className="grid grid-2">
                    {(data || []).map((course) => (
                        <Card
                            key={course.enrollment_id}
                            title={course.course_title}
                            action={<Badge>{course.course_code}</Badge>}
                        >
                            <p className="muted">Lecturer: {course.lecturer_name}</p>
                            <p className="muted">
                                Enrolled: {new Date(course.enrolled_at).toLocaleDateString()}
                            </p>
                            <Link to={`/student/courses/${course.course_id}`}>
                                Open course
                            </Link>
                        </Card>
                    ))}
                </div>
            </div>
        </AppShell>
    );
}
