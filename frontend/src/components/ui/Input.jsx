import styles from "./Input.module.css";

export function Field({
    label,
    error,
    hint,
    children,
    htmlFor
}) {
    return (
        <div className={styles.field}>
            {label && (
                <label className={styles.label} htmlFor={htmlFor}>
                    {label}
                </label>
            )}
            {children}
            {hint && !error && <span className={styles.hint}>{hint}</span>}
            {error && <span className={styles.error}>{error}</span>}
        </div>
    );
}

export function TextInput({ id, className = "", ...props }) {
    return (
        <input
            id={id}
            className={`${styles.input} ${className}`.trim()}
            {...props}
        />
    );
}

export function TextArea({ id, className = "", ...props }) {
    return (
        <textarea
            id={id}
            className={`${styles.textarea} ${className}`.trim()}
            {...props}
        />
    );
}

export function SelectInput({ id, className = "", children, ...props }) {
    return (
        <select
            id={id}
            className={`${styles.select} ${className}`.trim()}
            {...props}
        >
            {children}
        </select>
    );
}
