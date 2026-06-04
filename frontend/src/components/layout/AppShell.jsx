import { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { ROLE_LABELS } from "../../constants/roles";
import Button from "../ui/Button";
import Badge from "../ui/Badge";
import "../../styles/layout.css";

export default function AppShell({ title, navItems, children }) {
    const { user, logout } = useAuth();
    const [sidebarOpen, setSidebarOpen] = useState(false);

    useEffect(() => {
        document.body.classList.toggle("sidebar-open", sidebarOpen);

        return () => {
            document.body.classList.remove("sidebar-open");
        };
    }, [sidebarOpen]);

    useEffect(() => {
        const handleEscape = (event) => {
            if (event.key === "Escape") {
                setSidebarOpen(false);
            }
        };

        window.addEventListener("keydown", handleEscape);

        return () => {
            window.removeEventListener("keydown", handleEscape);
        };
    }, []);

    const closeSidebar = () => setSidebarOpen(false);

    return (
        <div className="app-shell">
            <button
                type="button"
                className="sidebar-backdrop"
                aria-label="Close navigation menu"
                onClick={closeSidebar}
            />

            <aside className={`sidebar${sidebarOpen ? " sidebar-open" : ""}`}>
                <div className="sidebar-header">
                    <div className="brand">
                        <span className="brand-mark">StudyHub</span>
                        <span className="brand-tagline">Learning, organized.</span>
                    </div>
                    <button
                        type="button"
                        className="sidebar-close"
                        aria-label="Close navigation menu"
                        onClick={closeSidebar}
                    >
                        ×
                    </button>
                </div>

                <nav className="nav-list">
                    {navItems.map((item) => (
                        <NavLink
                            key={item.to}
                            to={item.to}
                            className={({ isActive }) =>
                                `nav-link${isActive ? " active" : ""}`
                            }
                            end={item.end}
                            onClick={closeSidebar}
                        >
                            {item.label}
                        </NavLink>
                    ))}
                </nav>
            </aside>

            <div className="shell-main">
                <header className="topbar">
                    <div className="topbar-start">
                        <button
                            type="button"
                            className="menu-toggle"
                            aria-label="Open navigation menu"
                            aria-expanded={sidebarOpen}
                            onClick={() => setSidebarOpen(true)}
                        >
                            <span />
                            <span />
                            <span />
                        </button>
                        <h2 className="section-title">{title}</h2>
                    </div>

                    <div className="topbar-actions">
                        <div className="topbar-user">
                            <span className="topbar-name">{user.full_name}</span>
                            <span className="topbar-role">
                                {ROLE_LABELS[user.role]}
                            </span>
                        </div>
                        <Badge tone="neutral" className="topbar-badge">
                            {ROLE_LABELS[user.role]}
                        </Badge>
                        <Button variant="ghost" small onClick={logout}>
                            Sign out
                        </Button>
                    </div>
                </header>

                <main className="page-content">{children}</main>
            </div>
        </div>
    );
}
