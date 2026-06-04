import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import AppShell from "../../components/layout/AppShell";
import Card from "../../components/ui/Card";
import Spinner from "../../components/ui/Spinner";
import Button from "../../components/ui/Button";
import { getMyCourses } from "../../api/courses";
import { adminNav } from "./adminNav";

export default function AdminDashboard() {
    const navigate = useNavigate();
    const { data, isLoading } = useQuery({
        queryKey: ["admin-courses"],
        queryFn: async () => (await getMyCourses()).data
    });

    return (
        <AppShell title="Admin dashboard" navItems={adminNav}>
            <div className="stack">
                <div>
                    <h1 className="page-title">Administration</h1>
                    <p className="page-subtitle">
                        Oversee courses and create lecturer accounts.
                    </p>
                </div>

                {isLoading && <Spinner />}

                <div className="grid grid-3">
                    <Card title="Total courses">
                        <strong style={{ fontSize: "2rem" }}>{data?.length || 0}</strong>
                    </Card>
                </div>

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
                    </div>
                </Card>
            </div>
        </AppShell>
    );
}
