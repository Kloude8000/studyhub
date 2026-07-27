import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import AppShell from "../../components/layout/AppShell";
import Card from "../../components/ui/Card";
import Spinner from "../../components/ui/Spinner";
import Button from "../../components/ui/Button";
import { getAdminDashboard } from "../../api/dashboard";
import { adminNav } from "./adminNav";

export default function AdminDashboard() {
    const navigate = useNavigate();
    const { data, isLoading } = useQuery({
        queryKey: ["admin-dashboard"],
        queryFn: async () => (await getAdminDashboard()).data
    });

    return (
        <AppShell title="Admin dashboard" navItems={adminNav}>
            <div className="stack">
                <div>
                    <h1 className="page-title">Administration</h1>
                    <p className="page-subtitle">
                        Oversee courses, users, and platform reports.
                    </p>
                </div>

                {isLoading && <Spinner />}

                {!isLoading && (
                    <div className="grid grid-3">
                        <Card title="Total courses">
                            <strong style={{ fontSize: "2rem" }}>
                                {data?.course_count || 0}
                            </strong>
                        </Card>
                        <Card title="Students">
                            <strong style={{ fontSize: "2rem" }}>
                                {data?.student_count || 0}
                            </strong>
                        </Card>
                        <Card title="Lecturers">
                            <strong style={{ fontSize: "2rem" }}>
                                {data?.lecturer_count || 0}
                            </strong>
                        </Card>
                    </div>
                )}

                <Card title="Quick actions">
                    <div className="row">
                        <Button
                            small
                            onClick={() => navigate("/admin/lecturers/new")}
                        >
                            Create lecturer
                        </Button>
                        <Button
                            small
                            variant="secondary"
                            onClick={() => navigate("/admin/courses")}
                        >
                            View all courses
                        </Button>
                        <Button
                            small
                            variant="secondary"
                            onClick={() => navigate("/admin/users")}
                        >
                            User directory
                        </Button>
                        <Button
                            small
                            variant="secondary"
                            onClick={() => navigate("/admin/reports")}
                        >
                            Reports
                        </Button>
                    </div>
                </Card>
            </div>
        </AppShell>
    );
}
