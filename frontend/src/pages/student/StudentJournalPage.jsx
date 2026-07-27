import { useQuery } from "@tanstack/react-query";
import AppShell from "../../components/layout/AppShell";
import Card from "../../components/ui/Card";
import Spinner from "../../components/ui/Spinner";
import Alert from "../../components/ui/Alert";
import Pagination from "../../components/ui/Pagination";
import LearningLogEntry from "../../components/LearningLogEntry";
import { getMyLearningLogs } from "../../api/progress";
import { getErrorMessage } from "../../api/client";
import { useListControls } from "../../hooks/useListControls";
import { studentNav } from "./studentNav";

const SORT_OPTIONS = {
    recent: (a, b) => new Date(b.log_date) - new Date(a.log_date),
    topic: (a, b) => a.topic.localeCompare(b.topic),
    course: (a, b) => a.course_title.localeCompare(b.course_title)
};

export default function StudentJournalPage() {
    const { data, isLoading, error } = useQuery({
        queryKey: ["student-logs"],
        queryFn: async () => (await getMyLearningLogs()).data
    });

    const {
        paginatedItems,
        page,
        setPage,
        sortBy,
        setSortBy,
        totalPages,
        totalItems,
        resetPage
    } = useListControls(data, {
        defaultSort: "recent",
        sortOptions: SORT_OPTIONS
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

                <label className="field" htmlFor="journal_sort">
                    <span className="field-label">Sort by</span>
                    <select
                        id="journal_sort"
                        value={sortBy}
                        onChange={(event) => {
                            setSortBy(event.target.value);
                            resetPage();
                        }}
                    >
                        <option value="recent">Most recent</option>
                        <option value="topic">Topic</option>
                        <option value="course">Course</option>
                    </select>
                </label>

                {isLoading && <Spinner />}
                {error && <Alert tone="error">{getErrorMessage(error)}</Alert>}

                {!isLoading && !error && data?.length === 0 && (
                    <div className="empty-state">
                        <p>No journal entries yet. Add logs from an enrolled course.</p>
                    </div>
                )}

                <div className="stack">
                    {paginatedItems.map((log) => (
                        <Card key={log.log_id}>
                            <LearningLogEntry
                                log={log}
                                showCourseInfo
                            />
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
