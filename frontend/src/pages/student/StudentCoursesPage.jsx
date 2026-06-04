import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import AppShell from "../../components/layout/AppShell";
import Card from "../../components/ui/Card";
import Badge from "../../components/ui/Badge";
import Spinner from "../../components/ui/Spinner";
import Alert from "../../components/ui/Alert";
import { getCourses } from "../../api/courses";
import { getErrorMessage } from "../../api/client";
import { studentNav } from "./studentNav";

export default function StudentCoursesPage() {
    const { data, isLoading, error } = useQuery({
        queryKey: ["courses"],
        queryFn: async () => (await getCourses()).data
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

                {isLoading && <Spinner />}
                {error && <Alert tone="error">{getErrorMessage(error)}</Alert>}

                {!isLoading && !error && (
                    <div className="grid grid-2">
                        {(data || []).map((course) => (
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
                )}
            </div>
        </AppShell>
    );
}
