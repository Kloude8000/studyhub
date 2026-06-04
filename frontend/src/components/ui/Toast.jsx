import styles from "./Toast.module.css";

const TONES = {
    success: styles.toastSuccess,
    error: styles.toastError,
    info: styles.toastInfo
};

export default function Toast({ children, tone = "success", onDismiss }) {
    const classes = [styles.toast, TONES[tone] || TONES.success].join(" ");

    return (
        <div className={classes} role="status">
            <span className={styles.message}>{children}</span>
            <button
                type="button"
                className={styles.dismiss}
                onClick={onDismiss}
                aria-label="Dismiss notification"
            >
                ×
            </button>
        </div>
    );
}
