import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import AppShell from "../../components/layout/AppShell";
import Card from "../../components/ui/Card";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import Spinner from "../../components/ui/Spinner";
import Alert from "../../components/ui/Alert";
import Pagination from "../../components/ui/Pagination";
import { Field } from "../../components/ui/Input";
import { getMyEnrollments, unenrollFromCourse } from "../../api/enrollments";
import { getErrorMessage } from "../../api/client";
import { useToast } from "../../context/ToastContext";
import { useConfirm } from "../../context/ConfirmContext";
import { useListControls } from "../../hooks/useListControls";
import { studentNav } from "./studentNav";

const SORT_OPTIONS = {
    recent: (a, b) => new Date(b.enrolled_at) - new Date(a.enrolled_at),
    title: (a, b) => a.course_title.localeCompare(b.course_title)
};

export default function StudentEnrollmentsPage() {
    const queryClient = useQueryClient();
    const { showToast } = useToast();
    const { confirm } = useConfirm();

    const { data, isLoading, error } = useQuery({
        queryKey: ["student-enrollments"],
        queryFn: async () => (await getMyEnrollments()).data
    });

    const {
        paginatedItems,
        page,
        setPage,
        sortBy,
        setSortBy,
        totalPages,
        totalItems
    } = useListControls(data, {
        defaultSort: "recent",
        sortOptions: SORT_OPTIONS
    });

    const unenrollMutation = useMutation({
        mutationFn: (courseId) => unenrollFromCourse(courseId),
        onSuccess: async () => {
            showToast("You have left the course.");
            await queryClient.invalidateQueries({ queryKey: ["student-enrollments"] });
            await queryClient.invalidateQueries({ queryKey: ["student-progress"] });
        },
        onError: (err) => showToast(getErrorMessage(err), "error")
    });

    const handleUnenroll = async (course) => {
        const confirmed = await confirm({
            title: "Leave course?",
            message: `Drop ${course.course_title}? Your journal entries for this course will remain in the database but course access will end.`,
            confirmLabel: "Leave course",
            cancelLabel: "Stay enrolled",
            danger: true
        });

        if (confirmed) {
            unenrollMutation.mutate(course.course_id);
        }
    };

    return (
        <AppShell title="My enrollments" navItems={studentNav}>
            <div className="stack">
                <div>
                    <h1 className="page-title">My enrollments</h1>
                    <p className="page-subtitle">
                        Courses you are currently enrolled in.
                    </p>
                </div>

                <Field label="Sort by" htmlFor="enrollment_sort">
                    <select
                        id="enrollment_sort"
                        value={sortBy}
                        onChange={(event) => setSortBy(event.target.value)}
                    >
                        <option value="recent">Recently enrolled</option>
                        <option value="title">Course title</option>
                    </select>
                </Field>

                {isLoading && <Spinner />}
                {error && <Alert tone="error">{getErrorMessage(error)}</Alert>}

                {!isLoading && !error && data?.length === 0 && (
                    <div className="empty-state">
                        <p>No enrollments yet.</p>
                        <Link to="/student/courses">Browse courses</Link>
                    </div>
                )}

                <div className="grid grid-2">
                    {paginatedItems.map((course) => (
                        <Card
                            key={course.enrollment_id}
                            title={course.course_title}
                            action={<Badge>{course.course_code}</Badge>}
                        >
                            <p className="muted">Lecturer: {course.lecturer_name}</p>
                            <p className="muted">
                                Enrolled: {new Date(course.enrolled_at).toLocaleDateString()}
                            </p>
                            <div className="row">
                                <Link to={`/student/courses/${course.course_id}`}>
                                    Open course
                                </Link>
                                <Button
                                    small
                                    variant="danger"
                                    onClick={() => handleUnenroll(course)}
                                    disabled={unenrollMutation.isPending}
                                >
                                    Leave course
                                </Button>
                            </div>
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
