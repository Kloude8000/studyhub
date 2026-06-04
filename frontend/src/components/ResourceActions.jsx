import { useState } from "react";
import Button from "./ui/Button";
import { viewResource, downloadResource } from "../api/resources";
import { getErrorMessage } from "../api/client";
import { useToast } from "../context/ToastContext";
import styles from "./ResourceActions.module.css";

export default function ResourceActions({ resource }) {
    const { showToast } = useToast();
    const [loadingAction, setLoadingAction] = useState("");

    const handleView = async () => {
        setLoadingAction("view");

        try {
            await viewResource(resource);
        } catch (err) {
            showToast(getErrorMessage(err, "Unable to open resource"), "error");
        } finally {
            setLoadingAction("");
        }
    };

    const handleDownload = async () => {
        setLoadingAction("download");

        try {
            await downloadResource(
                resource.resource_id,
                resource.title,
                resource.file_type
            );
        } catch (err) {
            showToast(getErrorMessage(err, "Download failed"), "error");
        } finally {
            setLoadingAction("");
        }
    };

    return (
        <div className={styles.wrap}>
            <div className={styles.actions}>
                <Button
                    small
                    onClick={handleView}
                    disabled={Boolean(loadingAction)}
                >
                    {loadingAction === "view" ? "Opening..." : "View"}
                </Button>
                <Button
                    small
                    variant="secondary"
                    onClick={handleDownload}
                    disabled={Boolean(loadingAction)}
                >
                    {loadingAction === "download" ? "Downloading..." : "Download"}
                </Button>
            </div>
        </div>
    );
}
