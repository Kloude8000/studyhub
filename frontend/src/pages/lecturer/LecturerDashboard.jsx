import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import AppShell from "../../components/layout/AppShell";
import Card from "../../components/ui/Card";
import Spinner from "../../components/ui/Spinner";
import { getMyCourses } from "../../api/courses";
import { lecturerNav } from "./lecturerNav";

export default function LecturerDashboard() {
    const { data, isLoading } = useQuery({
        queryKey: ["lecturer-courses"],
        queryFn: async () => (await getMyCourses()).data
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

                <div className="grid grid-3">
                    <Card title="Your courses">
                        <strong style={{ fontSize: "2rem" }}>{data?.length || 0}</strong>
                    </Card>
                </div>

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
