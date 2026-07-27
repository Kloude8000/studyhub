import Button from "./Button";
import styles from "./Pagination.module.css";

export default function Pagination({
    page,
    totalPages,
    totalItems,
    onPageChange
}) {
    if (totalItems <= 0) {
        return null;
    }

    return (
        <div className={styles.pagination}>
            <span className="muted">
                Page {page} of {totalPages} · {totalItems} items
            </span>
            <div className={styles.actions}>
                <Button
                    small
                    variant="secondary"
                    disabled={page <= 1}
                    onClick={() => onPageChange(page - 1)}
                >
                    Previous
                </Button>
                <Button
                    small
                    variant="secondary"
                    disabled={page >= totalPages}
                    onClick={() => onPageChange(page + 1)}
                >
                    Next
                </Button>
            </div>
        </div>
    );
}
