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
        description: ""
    });
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (event) => {
        event.preventDefault();
        setLoading(true);

        try {
            const { data } = await createCourse(form);
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

                        <Button type="submit" disabled={loading}>
                            {loading ? "Creating..." : "Create course"}
                        </Button>
                    </form>
                </Card>
            </div>
        </AppShell>
    );
}
