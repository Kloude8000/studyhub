import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import AppShell from "../../components/layout/AppShell";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Badge from "../../components/ui/Badge";
import Spinner from "../../components/ui/Spinner";
import { Field, TextArea, TextInput } from "../../components/ui/Input";
import { getCourse } from "../../api/courses";
import { enrollInCourse, getMyEnrollments } from "../../api/enrollments";
import {
    getCourseResources
} from "../../api/resources";
import {
    addLearningLog,
    getLearningLogsByCourse,
    getMyProgress
} from "../../api/progress";
import { getErrorMessage } from "../../api/client";
import { useToast } from "../../context/ToastContext";
import { studentNav } from "./studentNav";
import { useState } from "react";
import ResourceActions from "../../components/ResourceActions";
import LearningLogEntry from "../../components/LearningLogEntry";

export default function StudentCourseDetailPage() {
    const { courseId } = useParams();
    const queryClient = useQueryClient();
    const { showToast } = useToast();
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

    const resourcesQuery = useQuery({
        queryKey: ["course-resources", courseId],
        queryFn: async () => (await getCourseResources(courseId)).data,
        enabled: Boolean(
            enrollmentsQuery.data?.some(
                (item) => String(item.course_id) === String(courseId)
            )
        )
    });

    const logsQuery = useQuery({
        queryKey: ["course-logs", courseId],
        queryFn: async () => (await getLearningLogsByCourse(courseId)).data,
        enabled: Boolean(
            enrollmentsQuery.data?.some(
                (item) => String(item.course_id) === String(courseId)
            )
        )
    });

    const progressQuery = useQuery({
        queryKey: ["student-progress"],
        queryFn: async () => (await getMyProgress()).data
    });

    const isEnrolled = enrollmentsQuery.data?.some(
        (item) => String(item.course_id) === String(courseId)
    );

    const courseProgress = progressQuery.data?.find(
        (item) => String(item.course_id) === String(courseId)
    );

    const enrollMutation = useMutation({
        mutationFn: () => enrollInCourse(courseId),
        onSuccess: async () => {
            showToast("Enrollment successful.");
            await queryClient.invalidateQueries({ queryKey: ["student-enrollments"] });
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

                    {!isEnrolled ? (
                        <Button
                            onClick={() => enrollMutation.mutate()}
                            disabled={enrollMutation.isPending}
                        >
                            {enrollMutation.isPending ? "Enrolling..." : "Enroll in course"}
                        </Button>
                    ) : (
                        <Badge tone="success">Enrolled</Badge>
                    )}
                </Card>

                {isEnrolled && (
                    <>
                        <Card title="Your progress">
                            {courseProgress ? (
                                <div className="row">
                                    <span>
                                        Study time: {courseProgress.total_study_time} min
                                    </span>
                                    <Badge tone="warning">
                                        {courseProgress.completion_percentage}% complete
                                    </Badge>
                                </div>
                            ) : (
                                <p className="muted">No progress recorded yet.</p>
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
