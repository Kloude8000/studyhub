import styles from "./ProgressBar.module.css";

export default function ProgressBar({
    value,
    targetMinutes,
    studyMinutes
}) {
    const percentage = Math.min(100, Math.max(0, Number(value) || 0));

    return (
        <div className="stack" style={{ gap: "0.5rem" }}>
            <div className={styles.progressMeta}>
                <span>{studyMinutes ?? 0} / {targetMinutes ?? 1000} min</span>
                <span>{percentage}%</span>
            </div>
            <div className={styles.progressBar}>
                <div
                    className={styles.progressBarFill}
                    style={{ width: `${percentage}%` }}
                />
            </div>
        </div>
    );
}
