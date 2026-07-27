import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import AppShell from "../../components/layout/AppShell";
import Card from "../../components/ui/Card";
import Badge from "../../components/ui/Badge";
import Spinner from "../../components/ui/Spinner";
import { getLecturerDashboard } from "../../api/dashboard";
import { lecturerNav } from "./lecturerNav";

export default function LecturerDashboard() {
    const { data, isLoading } = useQuery({
        queryKey: ["lecturer-dashboard"],
        queryFn: async () => (await getLecturerDashboard()).data
    });

    return (
        <AppShell title="Lecturer dashboard" navItems={lecturerNav}>
            <div className="stack">
                <div>
                    <h1 className="page-title">Teaching overview</h1>
                    <p className="page-subtitle">
                        Manage your courses, upload resources, and monitor student progress.
                    </p>
                </div>

                {isLoading && <Spinner />}

                {!isLoading && (
                    <div className="grid grid-3">
                        <Card title="Your courses">
                            <strong style={{ fontSize: "2rem" }}>
                                {data?.course_count || 0}
                            </strong>
                        </Card>
                        <Card title="Total enrollments">
                            <strong style={{ fontSize: "2rem" }}>
                                {data?.total_enrollments || 0}
                            </strong>
                        </Card>
                        <Card title="At-risk students">
                            <strong style={{ fontSize: "2rem" }}>
                                {data?.at_risk_count || 0}
                            </strong>
                        </Card>
                    </div>
                )}

                <Card title="Recent enrollments">
                    {!isLoading && data?.recent_enrollments?.length === 0 && (
                        <p className="muted">No recent enrollments.</p>
                    )}
                    <div className="stack">
                        {(data?.recent_enrollments || []).map((enrollment) => (
                            <div key={enrollment.enrollment_id} className="row">
                                <div>
                                    <strong>{enrollment.full_name}</strong>
                                    <p className="muted">{enrollment.course_title}</p>
                                </div>
                                <Badge tone="neutral">
                                    {new Date(enrollment.enrolled_at).toLocaleDateString()}
                                </Badge>
                            </div>
                        ))}
                    </div>
                </Card>

                <Card title="Quick actions">
                    <div className="row">
                        <Link to="/lecturer/courses/new">Create a course</Link>
                        <Link to="/lecturer/courses">View all courses</Link>
                    </div>
                </Card>
            </div>
        </AppShell>
    );
}
