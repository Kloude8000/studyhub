import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import AppShell from "../../components/layout/AppShell";
import Card from "../../components/ui/Card";
import Spinner from "../../components/ui/Spinner";
import { getMyEnrollments } from "../../api/enrollments";
import { getMyProgress } from "../../api/progress";
import { studentNav } from "./studentNav";

export default function StudentDashboard() {
    const enrollmentsQuery = useQuery({
        queryKey: ["student-enrollments"],
        queryFn: async () => (await getMyEnrollments()).data
    });

    const progressQuery = useQuery({
        queryKey: ["student-progress"],
        queryFn: async () => (await getMyProgress()).data
    });

    if (enrollmentsQuery.isLoading || progressQuery.isLoading) {
        return (
            <AppShell title="Student dashboard" navItems={studentNav}>
                <Spinner />
            </AppShell>
        );
    }

    const enrollments = enrollmentsQuery.data || [];
    const progress = progressQuery.data || [];

    return (
        <AppShell title="Student dashboard" navItems={studentNav}>
            <div className="stack">
                <div>
                    <h1 className="page-title">Your learning overview</h1>
                    <p className="page-subtitle">
                        Track enrollments, progress, and jump back into your courses.
                    </p>
                </div>

                <div className="grid grid-3">
                    <Card title="Enrolled courses">
                        <strong style={{ fontSize: "2rem" }}>{enrollments.length}</strong>
                    </Card>
                    <Card title="Courses with progress">
                        <strong style={{ fontSize: "2rem" }}>{progress.length}</strong>
                    </Card>
                    <Card title="Average completion">
                        <strong style={{ fontSize: "2rem" }}>
                            {progress.length
                                ? `${Math.round(
                                    progress.reduce(
                                        (sum, item) =>
                                            sum + Number(item.completion_percentage),
                                        0
                                    ) / progress.length
                                )}%`
                                : "0%"}
                        </strong>
                    </Card>
                </div>

                <Card title="Recent enrollments">
                    {enrollments.length === 0 ? (
                        <div className="empty-state">
                            <p>You have not enrolled in any courses yet.</p>
                            <Link to="/student/courses" style={{ color: "var(--color-primary)" }}>
                                Browse courses
                            </Link>
                        </div>
                    ) : (
                        <div className="stack">
                            {enrollments.slice(0, 4).map((course) => (
                                <div key={course.enrollment_id} className="row">
                                    <div>
                                        <strong>{course.course_title}</strong>
                                        <p className="muted">{course.course_code}</p>
                                    </div>
                                    <Link to={`/student/courses/${course.course_id}`}>
                                        Open course
                                    </Link>
                                </div>
                            ))}
                        </div>
                    )}
                </Card>
            </div>
        </AppShell>
    );
}
