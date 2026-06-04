import styles from "./Badge.module.css";

export default function Badge({ children, tone = "default", className = "" }) {
    const classes = [
        styles.badge,
        styles[tone] || styles.default,
        className
    ].filter(Boolean).join(" ");

    return (
        <span className={classes}>
            {children}
        </span>
    );
}
