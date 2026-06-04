import { createContext, useCallback, useContext, useMemo, useState } from "react";
import Toast from "../components/ui/Toast";
import styles from "../components/ui/Toast.module.css";

const ToastContext = createContext(null);

let toastId = 0;

export function ToastProvider({ children }) {
    const [toasts, setToasts] = useState([]);

    const dismissToast = useCallback((id) => {
        setToasts((current) => current.filter((toast) => toast.id !== id));
    }, []);

    const showToast = useCallback((message, tone = "success") => {
        const id = ++toastId;

        setToasts((current) => [...current, { id, message, tone }]);

        window.setTimeout(() => {
            dismissToast(id);
        }, 4000);
    }, [dismissToast]);

    const value = useMemo(
        () => ({ showToast }),
        [showToast]
    );

    return (
        <ToastContext.Provider value={value}>
            {children}
            <div
                className={styles.container}
                aria-live="polite"
                aria-relevant="additions"
            >
                {toasts.map((toast) => (
                    <Toast
                        key={toast.id}
                        tone={toast.tone}
                        onDismiss={() => dismissToast(toast.id)}
                    >
                        {toast.message}
                    </Toast>
                ))}
            </div>
        </ToastContext.Provider>
    );
}

export function useToast() {
    const context = useContext(ToastContext);

    if (!context) {
        throw new Error("useToast must be used within ToastProvider");
    }

    return context;
}
