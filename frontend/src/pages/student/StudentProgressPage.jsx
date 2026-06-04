import { useQuery } from "@tanstack/react-query";
import AppShell from "../../components/layout/AppShell";
import Card from "../../components/ui/Card";
import Badge from "../../components/ui/Badge";
import Spinner from "../../components/ui/Spinner";
import Alert from "../../components/ui/Alert";
import { getMyProgress } from "../../api/progress";
import { getErrorMessage } from "../../api/client";
import { studentNav } from "./studentNav";

export default function StudentProgressPage() {
    const { data, isLoading, error } = useQuery({
        queryKey: ["student-progress"],
        queryFn: async () => (await getMyProgress()).data
    });

    return (
        <AppShell title="Progress" navItems={studentNav}>
            <div className="stack">
                <div>
                    <h1 className="page-title">Your progress</h1>
                    <p className="page-subtitle">
                        Completion is calculated from total study time across each course.
                    </p>
                </div>

                {isLoading && <Spinner />}
                {error && <Alert tone="error">{getErrorMessage(error)}</Alert>}

                {!isLoading && !error && data?.length === 0 && (
                    <div className="empty-state">
                        <p>No progress yet. Start logging study time in a course.</p>
                    </div>
                )}

                <div className="grid grid-2">
                    {(data || []).map((item) => (
                        <Card
                            key={item.progress_id}
                            title={item.course_title}
                            action={<Badge>{item.course_code}</Badge>}
                        >
                            <p>Total study time: {item.total_study_time} minutes</p>
                            <Badge tone="warning">
                                {item.completion_percentage}% complete
                            </Badge>
                        </Card>
                    ))}
                </div>
            </div>
        </AppShell>
    );
}
