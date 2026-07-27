import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "react-router-dom";
import AppShell from "../../components/layout/AppShell";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Badge from "../../components/ui/Badge";
import Spinner from "../../components/ui/Spinner";
import ProgressBar from "../../components/ui/ProgressBar";
import { Field, TextArea, TextInput } from "../../components/ui/Input";
import { getCourse } from "../../api/courses";
import { enrollInCourse, getMyEnrollments, unenrollFromCourse } from "../../api/enrollments";
import { getCourseResources } from "../../api/resources";
import {
    addLearningLog,
    getLearningLogsByCourse,
    getMyProgress
} from "../../api/progress";
import { getCourseAnnouncements } from "../../api/announcements";
import { getErrorMessage } from "../../api/client";
import { useToast } from "../../context/ToastContext";
import { useConfirm } from "../../context/ConfirmContext";
import { studentNav } from "./studentNav";
import ResourceActions from "../../components/ResourceActions";
import LearningLogEntry from "../../components/LearningLogEntry";

export default function StudentCourseDetailPage() {
    const { courseId } = useParams();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { showToast } = useToast();
    const { confirm } = useConfirm();
    const [logForm, setLogForm] = useState({
        topic: "",
        study_duration: "",
        notes: "",
        log_date: new Date().toISOString().slice(0, 10)
    });

    const courseQuery = useQuery({
        queryKey: ["course", courseId],
        queryFn: async () => (await getCourse(courseId)).data
    });

    const enrollmentsQuery = useQuery({
        queryKey: ["student-enrollments"],
        queryFn: async () => (await getMyEnrollments()).data
    });

    const isEnrolled = enrollmentsQuery.data?.some(
        (item) => String(item.course_id) === String(courseId)
    );

    const resourcesQuery = useQuery({
        queryKey: ["course-resources", courseId],
        queryFn: async () => (await getCourseResources(courseId)).data,
        enabled: Boolean(isEnrolled)
    });

    const logsQuery = useQuery({
        queryKey: ["course-logs", courseId],
        queryFn: async () => (await getLearningLogsByCourse(courseId)).data,
        enabled: Boolean(isEnrolled)
    });

    const announcementsQuery = useQuery({
        queryKey: ["course-announcements", courseId],
        queryFn: async () => (await getCourseAnnouncements(courseId)).data,
        enabled: Boolean(isEnrolled)
    });

    const progressQuery = useQuery({
        queryKey: ["student-progress"],
        queryFn: async () => (await getMyProgress()).data
    });

    const courseProgress = progressQuery.data?.find(
        (item) => String(item.course_id) === String(courseId)
    );

    const targetMinutes =
        courseProgress?.completion_target_minutes
        ?? courseQuery.data?.completion_target_minutes
        ?? 1000;

    const enrollMutation = useMutation({
        mutationFn: () => enrollInCourse(courseId),
        onSuccess: async () => {
            showToast("Enrollment successful.");
            await queryClient.invalidateQueries({ queryKey: ["student-enrollments"] });
        },
        onError: (err) => showToast(getErrorMessage(err), "error")
    });

    const unenrollMutation = useMutation({
        mutationFn: () => unenrollFromCourse(courseId),
        onSuccess: async () => {
            showToast("You have left the course.");
            await queryClient.invalidateQueries({ queryKey: ["student-enrollments"] });
            await queryClient.invalidateQueries({ queryKey: ["student-progress"] });
            navigate("/student/enrollments");
        },
        onError: (err) => showToast(getErrorMessage(err), "error")
    });

    const logMutation = useMutation({
        mutationFn: () =>
            addLearningLog({
                course_id: Number(courseId),
                topic: logForm.topic,
                study_duration: Number(logForm.study_duration),
                notes: logForm.notes,
                log_date: logForm.log_date
            }),
        onSuccess: async () => {
            showToast("Learning log saved.");
            setLogForm((prev) => ({
                ...prev,
                topic: "",
                study_duration: "",
                notes: ""
            }));
            await queryClient.invalidateQueries({ queryKey: ["course-logs", courseId] });
            await queryClient.invalidateQueries({ queryKey: ["student-progress"] });
        },
        onError: (err) => showToast(getErrorMessage(err), "error")
    });

    const handleUnenroll = async () => {
        const confirmed = await confirm({
            title: "Leave course?",
            message: "You will lose access to course resources and announcements.",
            confirmLabel: "Leave course",
            cancelLabel: "Stay enrolled",
            danger: true
        });

        if (confirmed) {
            unenrollMutation.mutate();
        }
    };

    if (courseQuery.isLoading || enrollmentsQuery.isLoading) {
        return (
            <AppShell title="Course details" navItems={studentNav}>
                <Spinner />
            </AppShell>
        );
    }

    const course = courseQuery.data;

    return (
        <AppShell title="Course details" navItems={studentNav}>
            <div className="stack">
                <div className="row">
                    <Link to="/student/courses" className="muted">← Back to courses</Link>
                </div>

                <Card
                    title={course.course_title}
                    action={<Badge>{course.course_code}</Badge>}
                >
                    <p>{course.description}</p>
                    <p className="muted">Lecturer: {course.lecturer_name}</p>
                    <p className="muted">
                        Completion target: {targetMinutes} minutes of logged study time
                    </p>

                    {!isEnrolled ? (
                        <Button
                            onClick={() => enrollMutation.mutate()}
                            disabled={enrollMutation.isPending}
                        >
                            {enrollMutation.isPending ? "Enrolling..." : "Enroll in course"}
                        </Button>
                    ) : (
                        <div className="row">
                            <Badge tone="success">Enrolled</Badge>
                            <Button
                                small
                                variant="danger"
                                onClick={handleUnenroll}
                                disabled={unenrollMutation.isPending}
                            >
                                Leave course
                            </Button>
                        </div>
                    )}
                </Card>

                {isEnrolled && (
                    <>
                        <Card title="Announcements">
                            {announcementsQuery.isLoading && <Spinner />}
                            {!announcementsQuery.isLoading
                                && announcementsQuery.data?.length === 0 && (
                                <p className="muted">No announcements yet.</p>
                            )}
                            <div className="stack">
                                {(announcementsQuery.data || []).map((announcement) => (
                                    <div key={announcement.announcement_id}>
                                        <strong>{announcement.title}</strong>
                                        <p className="muted">
                                            {announcement.author_name} ·{" "}
                                            {new Date(
                                                announcement.created_at
                                            ).toLocaleDateString()}
                                        </p>
                                        <p>{announcement.body}</p>
                                    </div>
                                ))}
                            </div>
                        </Card>

                        <Card title="Your progress">
                            {courseProgress ? (
                                <ProgressBar
                                    value={courseProgress.completion_percentage}
                                    studyMinutes={courseProgress.total_study_time}
                                    targetMinutes={targetMinutes}
                                />
                            ) : (
                                <p className="muted">
                                    No progress recorded yet. Add a learning log to get started.
                                </p>
                            )}
                        </Card>

                        <Card title="Course resources">
                            {resourcesQuery.isLoading && <Spinner />}
                            {!resourcesQuery.isLoading && resourcesQuery.data?.length === 0 && (
                                <p className="muted">No resources uploaded yet.</p>
                            )}
                            <div className="stack">
                                {(resourcesQuery.data || []).map((resource) => (
                                    <div key={resource.resource_id} className="row">
                                        <div>
                                            <strong>{resource.title}</strong>
                                            <p className="muted">{resource.file_type}</p>
                                        </div>
                                        <ResourceActions resource={resource} />
                                    </div>
                                ))}
                            </div>
                        </Card>

                        <Card title="Add learning log">
                            <form
                                className="stack"
                                onSubmit={(event) => {
                                    event.preventDefault();
                                    logMutation.mutate();
                                }}
                            >
                                <Field label="Topic" htmlFor="topic">
                                    <TextInput
                                        id="topic"
                                        value={logForm.topic}
                                        onChange={(event) =>
                                            setLogForm((prev) => ({
                                                ...prev,
                                                topic: event.target.value
                                            }))
                                        }
                                        required
                                    />
                                </Field>

                                <Field label="Study duration (minutes)" htmlFor="study_duration">
                                    <TextInput
                                        id="study_duration"
                                        type="number"
                                        min="1"
                                        value={logForm.study_duration}
                                        onChange={(event) =>
                                            setLogForm((prev) => ({
                                                ...prev,
                                                study_duration: event.target.value
                                            }))
                                        }
                                        required
                                    />
                                </Field>

                                <Field label="Date" htmlFor="log_date">
                                    <TextInput
                                        id="log_date"
                                        type="date"
                                        value={logForm.log_date}
                                        onChange={(event) =>
                                            setLogForm((prev) => ({
                                                ...prev,
                                                log_date: event.target.value
                                            }))
                                        }
                                        required
                                    />
                                </Field>

                                <Field label="Notes" htmlFor="notes">
                                    <TextArea
                                        id="notes"
                                        value={logForm.notes}
                                        onChange={(event) =>
                                            setLogForm((prev) => ({
                                                ...prev,
                                                notes: event.target.value
                                            }))
                                        }
                                        placeholder="What did you learn? Capture ideas to revisit later."
                                    />
                                </Field>

                                <Button type="submit" disabled={logMutation.isPending}>
                                    {logMutation.isPending ? "Saving..." : "Save log entry"}
                                </Button>
                            </form>
                        </Card>

                        <Card title="Course journal">
                            {logsQuery.isLoading && <Spinner />}
                            {!logsQuery.isLoading && logsQuery.data?.length === 0 && (
                                <p className="muted">No journal entries yet.</p>
                            )}
                            <div className="stack">
                                {(logsQuery.data || []).map((log) => (
                                    <LearningLogEntry
                                        key={log.log_id}
                                        log={log}
                                    />
                                ))}
                            </div>
                        </Card>
                    </>
                )}
            </div>
        </AppShell>
    );
}
