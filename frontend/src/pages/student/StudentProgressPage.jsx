import { useQuery } from "@tanstack/react-query";
import AppShell from "../../components/layout/AppShell";
import Card from "../../components/ui/Card";
import Badge from "../../components/ui/Badge";
import Spinner from "../../components/ui/Spinner";
import Alert from "../../components/ui/Alert";
import ProgressBar from "../../components/ui/ProgressBar";
import Pagination from "../../components/ui/Pagination";
import { getMyProgress } from "../../api/progress";
import { getErrorMessage } from "../../api/client";
import { useListControls } from "../../hooks/useListControls";
import { studentNav } from "./studentNav";

const SORT_OPTIONS = {
    completion: (a, b) =>
        Number(b.completion_percentage) - Number(a.completion_percentage),
    title: (a, b) => a.course_title.localeCompare(b.course_title),
    time: (a, b) => Number(b.total_study_time) - Number(a.total_study_time)
};

export default function StudentProgressPage() {
    const { data, isLoading, error } = useQuery({
        queryKey: ["student-progress"],
        queryFn: async () => (await getMyProgress()).data
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
        defaultSort: "completion",
        sortOptions: SORT_OPTIONS
    });

    return (
        <AppShell title="Progress" navItems={studentNav}>
            <div className="stack">
                <div>
                    <h1 className="page-title">Your progress</h1>
                    <p className="page-subtitle">
                        Completion is based on logged study minutes compared to each course target.
                    </p>
                </div>

                <label className="field" htmlFor="progress_sort">
                    <span className="field-label">Sort by</span>
                    <select
                        id="progress_sort"
                        value={sortBy}
                        onChange={(event) => setSortBy(event.target.value)}
                    >
                        <option value="completion">Completion</option>
                        <option value="title">Course title</option>
                        <option value="time">Study time</option>
                    </select>
                </label>

                {isLoading && <Spinner />}
                {error && <Alert tone="error">{getErrorMessage(error)}</Alert>}

                {!isLoading && !error && data?.length === 0 && (
                    <div className="empty-state">
                        <p>No progress yet. Start logging study time in a course.</p>
                    </div>
                )}

                <div className="grid grid-2">
                    {paginatedItems.map((item) => (
                        <Card
                            key={item.progress_id}
                            title={item.course_title}
                            action={<Badge>{item.course_code}</Badge>}
                        >
                            <ProgressBar
                                value={item.completion_percentage}
                                studyMinutes={item.total_study_time}
                                targetMinutes={item.completion_target_minutes}
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
