import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import AppShell from "../components/layout/AppShell";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import Spinner from "../components/ui/Spinner";
import { Field, TextInput } from "../components/ui/Input";
import { getProfile, updateProfile } from "../api/profile";
import { getErrorMessage } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { ROLE_LABELS, ROLES } from "../constants/roles";
import { studentNav } from "./student/studentNav";
import { lecturerNav } from "./lecturer/lecturerNav";
import { adminNav } from "./admin/adminNav";

const NAV_BY_ROLE = {
    [ROLES.STUDENT]: studentNav,
    [ROLES.LECTURER]: lecturerNav,
    [ROLES.ADMIN]: adminNav
};

export default function ProfilePage() {
    const { user, loginSession } = useAuth();
    const { showToast } = useToast();
    const [form, setForm] = useState({
        full_name: "",
        email: "",
        current_password: "",
        new_password: "",
        confirm_password: ""
    });

    const profileQuery = useQuery({
        queryKey: ["profile"],
        queryFn: async () => (await getProfile()).data.user
    });

    useEffect(() => {
        if (profileQuery.data) {
            setForm((prev) => ({
                ...prev,
                full_name: profileQuery.data.full_name || "",
                email: profileQuery.data.email || ""
            }));
        }
    }, [profileQuery.data]);

    const updateMutation = useMutation({
        mutationFn: () => {
            const payload = {
                full_name: form.full_name,
                email: form.email
            };

            if (form.new_password) {
                payload.current_password = form.current_password;
                payload.new_password = form.new_password;
            }

            return updateProfile(payload);
        },
        onSuccess: (response) => {
            loginSession(response.data.token, response.data.user);
            showToast("Profile updated.");
            setForm((prev) => ({
                ...prev,
                current_password: "",
                new_password: "",
                confirm_password: ""
            }));
        },
        onError: (err) => showToast(getErrorMessage(err), "error")
    });

    const navItems = NAV_BY_ROLE[user.role] || studentNav;

    const handleSubmit = (event) => {
        event.preventDefault();

        if (form.new_password && form.new_password !== form.confirm_password) {
            showToast("New passwords do not match.", "error");
            return;
        }

        updateMutation.mutate();
    };

    if (profileQuery.isLoading) {
        return (
            <AppShell title="Profile" navItems={navItems}>
                <Spinner />
            </AppShell>
        );
    }

    return (
        <AppShell title="Profile" navItems={navItems}>
            <div className="stack">
                <div>
                    <h1 className="page-title">Your profile</h1>
                    <p className="page-subtitle">
                        Update your account details and password.
                    </p>
                </div>

                <Card title="Account">
                    <p className="muted">Role: {ROLE_LABELS[user.role]}</p>

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

                        <Field label="Current password" htmlFor="current_password">
                            <TextInput
                                id="current_password"
                                type="password"
                                value={form.current_password}
                                onChange={(event) =>
                                    setForm((prev) => ({
                                        ...prev,
                                        current_password: event.target.value
                                    }))
                                }
                                autoComplete="current-password"
                            />
                        </Field>

                        <Field label="New password" htmlFor="new_password">
                            <TextInput
                                id="new_password"
                                type="password"
                                value={form.new_password}
                                onChange={(event) =>
                                    setForm((prev) => ({
                                        ...prev,
                                        new_password: event.target.value
                                    }))
                                }
                                autoComplete="new-password"
                            />
                        </Field>

                        <Field label="Confirm new password" htmlFor="confirm_password">
                            <TextInput
                                id="confirm_password"
                                type="password"
                                value={form.confirm_password}
                                onChange={(event) =>
                                    setForm((prev) => ({
                                        ...prev,
                                        confirm_password: event.target.value
                                    }))
                                }
                                autoComplete="new-password"
                            />
                        </Field>

                        <Button type="submit" disabled={updateMutation.isPending}>
                            {updateMutation.isPending ? "Saving..." : "Save changes"}
                        </Button>
                    </form>
                </Card>
            </div>
        </AppShell>
    );
}
