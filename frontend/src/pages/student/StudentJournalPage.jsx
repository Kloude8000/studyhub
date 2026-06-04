import { useQuery } from "@tanstack/react-query";
import AppShell from "../../components/layout/AppShell";
import Card from "../../components/ui/Card";
import Spinner from "../../components/ui/Spinner";
import Alert from "../../components/ui/Alert";
import LearningLogEntry from "../../components/LearningLogEntry";
import { getMyLearningLogs } from "../../api/progress";
import { getErrorMessage } from "../../api/client";
import { studentNav } from "./studentNav";

export default function StudentJournalPage() {
    const { data, isLoading, error } = useQuery({
        queryKey: ["student-logs"],
        queryFn: async () => (await getMyLearningLogs()).data
    });

    return (
        <AppShell title="Study journal" navItems={studentNav}>
            <div className="stack">
                <div>
                    <h1 className="page-title">Study journal</h1>
                    <p className="page-subtitle">
                        Review what you have learned and revisit your notes over time.
                    </p>
                </div>

                {isLoading && <Spinner />}
                {error && <Alert tone="error">{getErrorMessage(error)}</Alert>}

                {!isLoading && !error && data?.length === 0 && (
                    <div className="empty-state">
                        <p>No journal entries yet. Add logs from an enrolled course.</p>
                    </div>
                )}

                <div className="stack">
                    {(data || []).map((log) => (
                        <Card key={log.log_id}>
                            <LearningLogEntry
                                log={log}
                                showCourseInfo
                            />
                        </Card>
                    ))}
                </div>
            </div>
        </AppShell>
    );
}
