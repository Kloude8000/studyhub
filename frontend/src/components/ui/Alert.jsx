import styles from "./Alert.module.css";

export default function Alert({ children, tone = "info" }) {
    return (
        <div className={`${styles.alert} ${styles[tone] || styles.info}`}>
            {children}
        </div>
    );
}
