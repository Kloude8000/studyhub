import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { login as loginRequest, register as registerRequest } from "../../api/auth";
import { getErrorMessage } from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import { ROLE_HOME } from "../../constants/roles";
import Button from "../../components/ui/Button";
import Alert from "../../components/ui/Alert";
import { Field, TextInput } from "../../components/ui/Input";
import "../../styles/layout.css";

export default function LoginPage() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { loginSession, isAuthenticated, user } = useAuth();
    const [form, setForm] = useState({ email: "", password: "" });
    const [error, setError] = useState("");
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
        setLoading(true);

        try {
            const { data } = await loginRequest(form.email, form.password);
            loginSession(data.token, data.user);
            navigate(ROLE_HOME[data.user.role], { replace: true });
        } catch (err) {
            setError(getErrorMessage(err, "Unable to sign in"));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-layout">
            <div className="auth-panel">
                <section className="auth-hero">
                    <div>
                        <h1>Welcome back to StudyHub</h1>
                        <p>
                            Continue your learning journey with courses,
                            resources, and your personal study journal.
                        </p>
                    </div>
                    <p className="muted" style={{ color: "rgba(255,255,255,0.7)" }}>
                        Demo: student@studyhub.test / password123
                    </p>
                </section>

                <section className="auth-form-wrap">
                    <div className="stack">
                        <div>
                            <h2 className="page-title">Sign in</h2>
                            <p className="page-subtitle">
                                Access your dashboard and enrolled courses.
                            </p>
                        </div>

                        {searchParams.get("session") === "expired" && (
                            <Alert tone="info">
                                Your session expired. Please sign in again.
                            </Alert>
                        )}

                        {error && <Alert tone="error">{error}</Alert>}

                        <form className="stack" onSubmit={handleSubmit}>
                            <Field label="Email" htmlFor="email">
                                <TextInput
                                    id="email"
                                    name="email"
                                    type="email"
                                    value={form.email}
                                    onChange={handleChange}
                                    required
                                    autoComplete="email"
                                />
                            </Field>

                            <Field label="Password" htmlFor="password">
                                <TextInput
                                    id="password"
                                    name="password"
                                    type="password"
                                    value={form.password}
                                    onChange={handleChange}
                                    required
                                    autoComplete="current-password"
                                />
                            </Field>

                            <Button type="submit" block disabled={loading}>
                                {loading ? "Signing in..." : "Sign in"}
                            </Button>
                        </form>

                        <p className="muted">
                            New student?{" "}
                            <Link to="/register" style={{ color: "var(--color-primary)" }}>
                                Create an account
                            </Link>
                        </p>
                    </div>
                </section>
            </div>
        </div>
    );
}
