import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { register as registerRequest } from "../../api/auth";
import { getErrorMessage } from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import { ROLE_HOME } from "../../constants/roles";
import Button from "../../components/ui/Button";
import Alert from "../../components/ui/Alert";
import { Field, TextInput } from "../../components/ui/Input";
import "../../styles/layout.css";

export default function RegisterPage() {
    const navigate = useNavigate();
    const { isAuthenticated, user } = useAuth();
    const [form, setForm] = useState({
        full_name: "",
        email: "",
        password: ""
    });
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isAuthenticated && user) {
            navigate(ROLE_HOME[user.role], { replace: true });
        }
    }, [isAuthenticated, user, navigate]);

    const handleChange = (event) => {
        setForm((prev) => ({
            ...prev,
            [event.target.name]: event.target.value
        }));
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        setError("");
        setSuccess("");
        setLoading(true);

        try {
            await registerRequest(form.full_name, form.email, form.password);
            setSuccess("Account created. You can now sign in.");
            setTimeout(() => navigate("/login"), 1200);
        } catch (err) {
            setError(getErrorMessage(err, "Unable to register"));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-layout">
            <div className="auth-panel">
                <section className="auth-hero">
                    <div>
                        <h1>Start learning with StudyHub</h1>
                        <p>
                            Create a student account to browse courses, track
                            progress, and keep a personal study journal.
                        </p>
                    </div>
                </section>

                <section className="auth-form-wrap">
                    <div className="stack">
                        <div>
                            <h2 className="page-title">Create account</h2>
                            <p className="page-subtitle">
                                Public registration is available for students only.
                            </p>
                        </div>

                        {error && <Alert tone="error">{error}</Alert>}
                        {success && <Alert tone="success">{success}</Alert>}

                        <form className="stack" onSubmit={handleSubmit}>
                            <Field label="Full name" htmlFor="full_name">
                                <TextInput
                                    id="full_name"
                                    name="full_name"
                                    value={form.full_name}
                                    onChange={handleChange}
                                    required
                                />
                            </Field>

                            <Field label="Email" htmlFor="email">
                                <TextInput
                                    id="email"
                                    name="email"
                                    type="email"
                                    value={form.email}
                                    onChange={handleChange}
                                    required
                                />
                            </Field>

                            <Field label="Password" htmlFor="password" hint="Minimum 6 characters">
                                <TextInput
                                    id="password"
                                    name="password"
                                    type="password"
                                    value={form.password}
                                    onChange={handleChange}
                                    minLength={6}
                                    required
                                />
                            </Field>

                            <Button type="submit" block disabled={loading}>
                                {loading ? "Creating account..." : "Create account"}
                            </Button>
                        </form>

                        <p className="muted">
                            Already have an account?{" "}
                            <Link to="/login" style={{ color: "var(--color-primary)" }}>
                                Sign in
                            </Link>
                        </p>
                    </div>
                </section>
            </div>
        </div>
    );
}
