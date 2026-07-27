import { useState } from "react";
import { useNavigate } from "react-router-dom";
import AppShell from "../../components/layout/AppShell";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import { Field, TextArea, TextInput } from "../../components/ui/Input";
import { createCourse } from "../../api/courses";
import { getErrorMessage } from "../../api/client";
import { useToast } from "../../context/ToastContext";
import { lecturerNav } from "./lecturerNav";

export default function LecturerCreateCoursePage() {
    const navigate = useNavigate();
    const { showToast } = useToast();
    const [form, setForm] = useState({
        course_code: "",
        course_title: "",
        description: "",
        completion_target_minutes: "1000"
    });
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (event) => {
        event.preventDefault();
        setLoading(true);

        try {
            const { data } = await createCourse({
                ...form,
                completion_target_minutes: Number(form.completion_target_minutes)
            });
            showToast("Course created.");
            navigate(`/lecturer/courses/${data.course_id}`);
        } catch (err) {
            showToast(getErrorMessage(err), "error");
        } finally {
            setLoading(false);
        }
    };

    return (
        <AppShell title="Create course" navItems={lecturerNav}>
            <div className="stack">
                <div>
                    <h1 className="page-title">Create a new course</h1>
                    <p className="page-subtitle">
                        Add course details to start uploading resources and enrolling students.
                    </p>
                </div>

                <Card title="Course information">
                    <form className="stack" onSubmit={handleSubmit}>
                        <Field label="Course code" htmlFor="course_code">
                            <TextInput
                                id="course_code"
                                value={form.course_code}
                                onChange={(event) =>
                                    setForm((prev) => ({
                                        ...prev,
                                        course_code: event.target.value
                                    }))
                                }
                                required
                            />
                        </Field>

                        <Field label="Course title" htmlFor="course_title">
                            <TextInput
                                id="course_title"
                                value={form.course_title}
                                onChange={(event) =>
                                    setForm((prev) => ({
                                        ...prev,
                                        course_title: event.target.value
                                    }))
                                }
                                required
                            />
                        </Field>

                        <Field label="Description" htmlFor="description">
                            <TextArea
                                id="description"
                                value={form.description}
                                onChange={(event) =>
                                    setForm((prev) => ({
                                        ...prev,
                                        description: event.target.value
                                    }))
                                }
                            />
                        </Field>

                        <Field
                            label="Completion target (minutes)"
                            htmlFor="completion_target_minutes"
                            hint="Students reach 100% after logging this many study minutes."
                        >
                            <TextInput
                                id="completion_target_minutes"
                                type="number"
                                min="1"
                                value={form.completion_target_minutes}
                                onChange={(event) =>
                                    setForm((prev) => ({
                                        ...prev,
                                        completion_target_minutes: event.target.value
                                    }))
                                }
                                required
                            />
                        </Field>

                        <Button type="submit" disabled={loading}>
                            {loading ? "Creating..." : "Create course"}
                        </Button>
                    </form>
                </Card>
            </div>
        </AppShell>
    );
}
