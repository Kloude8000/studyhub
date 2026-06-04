import styles from "./Spinner.module.css";

export default function Spinner() {
    return (
        <div className={styles.wrap}>
            <div className={styles.spinner} aria-label="Loading" />
        </div>
    );
}
