import styles from "./Card.module.css";

export default function Card({
    title,
    action,
    children,
    footer,
    interactive = false,
    className = ""
}) {
    const classes = [
        styles.card,
        interactive ? styles.interactive : "",
        className
    ].filter(Boolean).join(" ");

    return (
        <article className={classes}>
            {(title || action) && (
                <div className={styles.cardHeader}>
                    {title && <h3 className={styles.cardTitle}>{title}</h3>}
                    {action}
                </div>
            )}
            <div className={styles.cardBody}>{children}</div>
            {footer && <div className={styles.cardFooter}>{footer}</div>}
        </article>
    );
}
