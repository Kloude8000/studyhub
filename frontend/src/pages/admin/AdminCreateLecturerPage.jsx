import { useState } from "react";
import AppShell from "../../components/layout/AppShell";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import { Field, TextInput } from "../../components/ui/Input";
import { createLecturer } from "../../api/auth";
import { getErrorMessage } from "../../api/client";
import { useToast } from "../../context/ToastContext";
import { adminNav } from "./adminNav";

export default function AdminCreateLecturerPage() {
    const { showToast } = useToast();
    const [form, setForm] = useState({
        full_name: "",
        email: "",
        password: ""
    });
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (event) => {
        event.preventDefault();
        setLoading(true);

        try {
            await createLecturer(form);
            showToast("Lecturer account created successfully.");
            setForm({ full_name: "", email: "", password: "" });
        } catch (err) {
            showToast(getErrorMessage(err), "error");
        } finally {
            setLoading(false);
        }
    };

    return (
        <AppShell title="Create lecturer" navItems={adminNav}>
            <div className="stack">
                <div>
                    <h1 className="page-title">Create lecturer account</h1>
                    <p className="page-subtitle">
                        Admin-only flow for onboarding new lecturers.
                    </p>
                </div>

                <Card title="Lecturer details">
                    <form className="stack" onSubmit={handleSubmit}>
                        <Field label="Full name" htmlFor="full_name">
                            <TextInput
                                id="full_name"
                                value={form.full_name}
                                onChange={(event) =>
                                    setForm((prev) => ({
                                        ...prev,
                                        full_name: event.target.value
                                    }))
                                }
                                required
                            />
                        </Field>

                        <Field label="Email" htmlFor="email">
                            <TextInput
                                id="email"
                                type="email"
                                value={form.email}
                                onChange={(event) =>
                                    setForm((prev) => ({
                                        ...prev,
                                        email: event.target.value
                                    }))
                                }
                                required
                            />
                        </Field>

                        <Field label="Password" htmlFor="password">
                            <TextInput
                                id="password"
                                type="password"
                                value={form.password}
                                onChange={(event) =>
                                    setForm((prev) => ({
                                        ...prev,
                                        password: event.target.value
                                    }))
                                }
                                minLength={6}
                                required
                            />
                        </Field>

                        <Button type="submit" disabled={loading}>
                            {loading ? "Creating..." : "Create lecturer"}
                        </Button>
                    </form>
                </Card>
            </div>
        </AppShell>
    );
}
