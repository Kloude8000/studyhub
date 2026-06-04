import { createContext, useCallback, useContext, useMemo, useState } from "react";
import Button from "../components/ui/Button";
import styles from "../components/ui/ConfirmDialog.module.css";

const ConfirmContext = createContext(null);

export function ConfirmProvider({ children }) {
    const [state, setState] = useState(null);

    const confirm = useCallback((options) => {
        return new Promise((resolve) => {
            setState({
                ...options,
                resolve
            });
        });
    }, []);

    const close = useCallback((result) => {
        setState((current) => {
            current?.resolve(result);
            return null;
        });
    }, []);

    const value = useMemo(() => ({ confirm }), [confirm]);

    return (
        <ConfirmContext.Provider value={value}>
            {children}
            {state && (
                <div
                    className={styles.overlay}
                    role="presentation"
                    onClick={() => close(false)}
                >
                    <div
                        className={styles.dialog}
                        role="alertdialog"
                        aria-modal="true"
                        aria-labelledby="confirm-dialog-title"
                        aria-describedby="confirm-dialog-message"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <h3 id="confirm-dialog-title" className={styles.title}>
                            {state.title || "Are you sure?"}
                        </h3>
                        {state.message && (
                            <p id="confirm-dialog-message" className={styles.message}>
                                {state.message}
                            </p>
                        )}
                        <div className={styles.actions}>
                            <Button
                                variant="secondary"
                                small
                                onClick={() => close(false)}
                            >
                                {state.cancelLabel || "Cancel"}
                            </Button>
                            <Button
                                variant={state.danger ? "danger" : "primary"}
                                small
                                onClick={() => close(true)}
                            >
                                {state.confirmLabel || "Confirm"}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </ConfirmContext.Provider>
    );
}

export function useConfirm() {
    const context = useContext(ConfirmContext);

    if (!context) {
        throw new Error("useConfirm must be used within ConfirmProvider");
    }

    return context;
}
