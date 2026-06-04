import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import Badge from "./ui/Badge";
import Button from "./ui/Button";
import { Field, TextArea, TextInput } from "./ui/Input";
import { updateLearningLog } from "../api/progress";
import { getErrorMessage } from "../api/client";
import { useToast } from "../context/ToastContext";
import styles from "./LearningLogEntry.module.css";

const formatLogDate = (value) => {
    if (!value) {
        return "";
    }

    return String(value).slice(0, 10);
};

const buildFormState = (log) => ({
    topic: log.topic || "",
    study_duration: String(log.study_duration ?? ""),
    notes: log.notes || "",
    log_date: formatLogDate(log.log_date)
});

export default function LearningLogEntry({
    log,
    showCourseInfo = false
}) {
    const queryClient = useQueryClient();
    const { showToast } = useToast();
    const [isEditing, setIsEditing] = useState(false);
    const [form, setForm] = useState(() => buildFormState(log));

    const updateMutation = useMutation({
        mutationFn: () =>
            updateLearningLog(log.log_id, {
                topic: form.topic,
                study_duration: Number(form.study_duration),
                notes: form.notes,
                log_date: form.log_date
            }),
        onSuccess: async () => {
            setIsEditing(false);
            showToast("Journal entry updated.");
            await queryClient.invalidateQueries({ queryKey: ["student-logs"] });
            await queryClient.invalidateQueries({
                queryKey: ["course-logs", String(log.course_id)]
            });
            await queryClient.invalidateQueries({ queryKey: ["student-progress"] });
        },
        onError: (err) => showToast(getErrorMessage(err), "error")
    });

    const handleCancel = () => {
        setForm(buildFormState(log));
        setIsEditing(false);
    };

    if (isEditing) {
        return (
            <article className={styles.entry}>
                <form
                    className="stack"
                    onSubmit={(event) => {
                        event.preventDefault();
                        updateMutation.mutate();
                    }}
                >
                    <Field label="Topic" htmlFor={`topic-${log.log_id}`}>
                        <TextInput
                            id={`topic-${log.log_id}`}
                            value={form.topic}
                            onChange={(event) =>
                                setForm((prev) => ({
                                    ...prev,
                                    topic: event.target.value
                                }))
                            }
                            required
                        />
                    </Field>

                    <Field
                        label="Study duration (minutes)"
                        htmlFor={`study_duration-${log.log_id}`}
                    >
                        <TextInput
                            id={`study_duration-${log.log_id}`}
                            type="number"
                            min="1"
                            value={form.study_duration}
                            onChange={(event) =>
                                setForm((prev) => ({
                                    ...prev,
                                    study_duration: event.target.value
                                }))
                            }
                            required
                        />
                    </Field>

                    <Field label="Date" htmlFor={`log_date-${log.log_id}`}>
                        <TextInput
                            id={`log_date-${log.log_id}`}
                            type="date"
                            value={form.log_date}
                            onChange={(event) =>
                                setForm((prev) => ({
                                    ...prev,
                                    log_date: event.target.value
                                }))
                            }
                            required
                        />
                    </Field>

                    <Field label="Notes" htmlFor={`notes-${log.log_id}`}>
                        <TextArea
                            id={`notes-${log.log_id}`}
                            value={form.notes}
                            onChange={(event) =>
                                setForm((prev) => ({
                                    ...prev,
                                    notes: event.target.value
                                }))
                            }
                            placeholder="What did you learn?"
                        />
                    </Field>

                    <div className={styles.actions}>
                        <Button
                            type="submit"
                            small
                            disabled={updateMutation.isPending}
                        >
                            {updateMutation.isPending ? "Saving..." : "Save"}
                        </Button>
                        <Button
                            type="button"
                            small
                            variant="secondary"
                            onClick={handleCancel}
                            disabled={updateMutation.isPending}
                        >
                            Cancel
                        </Button>
                    </div>
                </form>
            </article>
        );
    }

    return (
        <article className={styles.entry}>
            <div className="row">
                <strong>{log.topic}</strong>
                <div className={styles.headerActions}>
                    <Badge tone="neutral">{formatLogDate(log.log_date)}</Badge>
                    <Button
                        small
                        variant="secondary"
                        onClick={() => {
                            setForm(buildFormState(log));
                            setIsEditing(true);
                        }}
                    >
                        Edit
                    </Button>
                </div>
            </div>

            {showCourseInfo && (
                <p className="muted">
                    {log.course_code} · {log.course_title}
                </p>
            )}

            <p className="muted">{log.study_duration} minutes studied</p>

            {log.notes ? (
                <p>{log.notes}</p>
            ) : (
                <p className="muted">No notes for this entry.</p>
            )}
        </article>
    );
}
