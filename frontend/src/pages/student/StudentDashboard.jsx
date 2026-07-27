import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import AppShell from "../../components/layout/AppShell";
import Card from "../../components/ui/Card";
import Badge from "../../components/ui/Badge";
import Spinner from "../../components/ui/Spinner";
import ProgressBar from "../../components/ui/ProgressBar";
import Pagination from "../../components/ui/Pagination";
import { getMyEnrollments } from "../../api/enrollments";
import { getMyProgress } from "../../api/progress";
import { useListControls } from "../../hooks/useListControls";
import { studentNav } from "./studentNav";

const SORT_OPTIONS = {
    completion: (a, b) =>
        Number(b.completion_percentage) - Number(a.completion_percentage),
    title: (a, b) => a.course_title.localeCompare(b.course_title)
};

export default function StudentDashboard() {
    const enrollmentsQuery = useQuery({
        queryKey: ["student-enrollments"],
        queryFn: async () => (await getMyEnrollments()).data
    });

    const progressQuery = useQuery({
        queryKey: ["student-progress"],
        queryFn: async () => (await getMyProgress()).data
    });

    const {
        paginatedItems: recentEnrollments,
        page,
        setPage,
        totalPages,
        totalItems
    } = useListControls(enrollmentsQuery.data, {
        pageSize: 4,
        defaultSort: "title",
        sortOptions: {
            title: (a, b) => a.course_title.localeCompare(b.course_title)
        }
    });

    const {
        paginatedItems: progressItems,
        page: progressPage,
        setPage: setProgressPage,
        totalPages: progressTotalPages,
        totalItems: progressTotalItems
    } = useListControls(progressQuery.data, {
        pageSize: 4,
        defaultSort: "completion",
        sortOptions: SORT_OPTIONS
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

                <Card title="Course progress">
                    {progress.length === 0 ? (
                        <div className="empty-state">
                            <p>No progress recorded yet.</p>
                        </div>
                    ) : (
                        <div className="stack">
                            {progressItems.map((item) => (
                                <div key={item.progress_id} className="stack">
                                    <div className="row">
                                        <strong>{item.course_title}</strong>
                                        <Badge>{item.course_code}</Badge>
                                    </div>
                                    <ProgressBar
                                        value={item.completion_percentage}
                                        studyMinutes={item.total_study_time}
                                        targetMinutes={item.completion_target_minutes}
                                    />
                                </div>
                            ))}
                            <Pagination
                                page={progressPage}
                                totalPages={progressTotalPages}
                                totalItems={progressTotalItems}
                                onPageChange={setProgressPage}
                            />
                        </div>
                    )}
                </Card>

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
                            {recentEnrollments.map((course) => (
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
                            <Pagination
                                page={page}
                                totalPages={totalPages}
                                totalItems={totalItems}
                                onPageChange={setPage}
                            />
                        </div>
                    )}
                </Card>
            </div>
        </AppShell>
    );
}
