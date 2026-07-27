import { useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import AppShell from "../../components/layout/AppShell";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Badge from "../../components/ui/Badge";
import Spinner from "../../components/ui/Spinner";
import Tabs from "../../components/ui/Tabs";
import Pagination from "../../components/ui/Pagination";
import { Field, TextArea, TextInput } from "../../components/ui/Input";
import {
    deleteCourse,
    getCourse,
    getLecturers,
    reassignLecturer,
    updateCourse
} from "../../api/courses";
import { getCourseEnrollments } from "../../api/enrollments";
import {
    createAnnouncement,
    deleteAnnouncement,
    getCourseAnnouncements
} from "../../api/announcements";
import {
    deleteResource,
    getCourseResources,
    uploadResource
} from "../../api/resources";
import { exportCourseProgress, getCourseProgress } from "../../api/progress";
import { getErrorMessage } from "../../api/client";
import { downloadBlob } from "../../utils/downloads";
import { useListControls } from "../../hooks/useListControls";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { useConfirm } from "../../context/ConfirmContext";
import { ROLES } from "../../constants/roles";
import { lecturerNav } from "./lecturerNav";
import { adminNav } from "../admin/adminNav";
import ResourceActions from "../../components/ResourceActions";

const MANAGE_TABS = [
    { id: "details", label: "Details" },
    { id: "announcements", label: "Announcements" },
    { id: "resources", label: "Resources" },
    { id: "students", label: "Students" },
    { id: "progress", label: "Progress" }
];

export default function LecturerCourseManagePage() {
    const { courseId } = useParams();
    const location = useLocation();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { user } = useAuth();
    const { showToast } = useToast();
    const { confirm } = useConfirm();
    const isAdminRoute = location.pathname.startsWith("/admin/courses/");
    const shellNav = isAdminRoute ? adminNav : lecturerNav;
    const backPath = isAdminRoute ? "/admin/courses" : "/lecturer/courses";
    const pageTitle = isAdminRoute ? "Admin · Manage course" : "Manage course";

    const [activeTab, setActiveTab] = useState("details");
    const [editForm, setEditForm] = useState(null);
    const [uploadTitle, setUploadTitle] = useState("");
    const [uploadFile, setUploadFile] = useState(null);
    const [announcementForm, setAnnouncementForm] = useState({ title: "", body: "" });
    const [selectedLecturerId, setSelectedLecturerId] = useState("");
    const [exporting, setExporting] = useState(null);

    const courseQuery = useQuery({
        queryKey: ["course", courseId],
        queryFn: async () => {
            const response = await getCourse(courseId);
            setEditForm({
                course_code: response.data.course_code,
                course_title: response.data.course_title,
                description: response.data.description || "",
                completion_target_minutes: String(
                    response.data.completion_target_minutes ?? 1000
                )
            });
            setSelectedLecturerId(String(response.data.lecturer_id));
            return response.data;
        }
    });

    const lecturersQuery = useQuery({
        queryKey: ["lecturers"],
        queryFn: async () => (await getLecturers()).data,
        enabled: isAdminRoute && user.role === ROLES.ADMIN
    });

    const resourcesQuery = useQuery({
        queryKey: ["course-resources", courseId],
        queryFn: async () => (await getCourseResources(courseId)).data
    });

    const announcementsQuery = useQuery({
        queryKey: ["course-announcements", courseId],
        queryFn: async () => (await getCourseAnnouncements(courseId)).data
    });

    const enrollmentsQuery = useQuery({
        queryKey: ["course-enrollments", courseId],
        queryFn: async () => (await getCourseEnrollments(courseId)).data
    });

    const progressQuery = useQuery({
        queryKey: ["course-progress", courseId],
        queryFn: async () => (await getCourseProgress(courseId)).data
    });

    const {
        paginatedItems: paginatedResources,
        page: resourcesPage,
        setPage: setResourcesPage,
        totalPages: resourcesTotalPages,
        totalItems: resourcesTotalItems
    } = useListControls(resourcesQuery.data, { pageSize: 6 });

    const {
        paginatedItems: paginatedStudents,
        page: studentsPage,
        setPage: setStudentsPage,
        totalPages: studentsTotalPages,
        totalItems: studentsTotalItems
    } = useListControls(enrollmentsQuery.data, { pageSize: 8 });

    const {
        paginatedItems: paginatedProgress,
        page: progressPage,
        setPage: setProgressPage,
        totalPages: progressTotalPages,
        totalItems: progressTotalItems
    } = useListControls(progressQuery.data, {
        pageSize: 8,
        defaultSort: "risk",
        sortOptions: {
            risk: (a, b) => Number(b.at_risk) - Number(a.at_risk),
            name: (a, b) => a.student_name.localeCompare(b.student_name),
            completion: (a, b) =>
                Number(a.completion_percentage) - Number(b.completion_percentage)
        }
    });

    const updateMutation = useMutation({
        mutationFn: () => updateCourse(courseId, {
            ...editForm,
            completion_target_minutes: Number(editForm.completion_target_minutes)
        }),
        onSuccess: async () => {
            showToast("Course updated.");
            await queryClient.invalidateQueries({ queryKey: ["course", courseId] });
            await queryClient.invalidateQueries({ queryKey: ["lecturer-courses"] });
            await queryClient.invalidateQueries({ queryKey: ["admin-courses"] });
        },
        onError: (err) => showToast(getErrorMessage(err), "error")
    });

    const reassignMutation = useMutation({
        mutationFn: () => reassignLecturer(courseId, Number(selectedLecturerId)),
        onSuccess: async () => {
            showToast("Lecturer reassigned.");
            await queryClient.invalidateQueries({ queryKey: ["course", courseId] });
            await queryClient.invalidateQueries({ queryKey: ["admin-courses"] });
        },
        onError: (err) => showToast(getErrorMessage(err), "error")
    });

    const deleteMutation = useMutation({
        mutationFn: () => deleteCourse(courseId),
        onSuccess: () => {
            showToast("Course deleted.");
            navigate(backPath);
        },
        onError: (err) => showToast(getErrorMessage(err), "error")
    });

    const uploadMutation = useMutation({
        mutationFn: () => {
            const formData = new FormData();
            formData.append("title", uploadTitle);
            formData.append("file", uploadFile);
            return uploadResource(courseId, formData);
        },
        onSuccess: async () => {
            showToast("Resource uploaded.");
            setUploadTitle("");
            setUploadFile(null);
            await queryClient.invalidateQueries({
                queryKey: ["course-resources", courseId]
            });
        },
        onError: (err) => showToast(getErrorMessage(err), "error")
    });

    const deleteResourceMutation = useMutation({
        mutationFn: (resourceId) => deleteResource(resourceId),
        onSuccess: async () => {
            showToast("Resource deleted.");
            await queryClient.invalidateQueries({
                queryKey: ["course-resources", courseId]
            });
        },
        onError: (err) => showToast(getErrorMessage(err), "error")
    });

    const announcementMutation = useMutation({
        mutationFn: () => createAnnouncement(courseId, announcementForm),
        onSuccess: async () => {
            showToast("Announcement posted.");
            setAnnouncementForm({ title: "", body: "" });
            await queryClient.invalidateQueries({
                queryKey: ["course-announcements", courseId]
            });
        },
        onError: (err) => showToast(getErrorMessage(err), "error")
    });

    const deleteAnnouncementMutation = useMutation({
        mutationFn: (announcementId) => deleteAnnouncement(announcementId),
        onSuccess: async () => {
            showToast("Announcement deleted.");
            await queryClient.invalidateQueries({
                queryKey: ["course-announcements", courseId]
            });
        },
        onError: (err) => showToast(getErrorMessage(err), "error")
    });

    const handleDeleteCourse = async () => {
        const confirmed = await confirm({
            title: "Delete course?",
            message: "This will permanently remove the course, its resources, and enrollments.",
            confirmLabel: "Delete course",
            cancelLabel: "Keep course",
            danger: true
        });

        if (confirmed) {
            deleteMutation.mutate();
        }
    };

    const handleDeleteResource = async (resource) => {
        const confirmed = await confirm({
            title: "Delete resource?",
            message: `Remove "${resource.title}" from this course?`,
            confirmLabel: "Delete",
            cancelLabel: "Cancel",
            danger: true
        });

        if (confirmed) {
            deleteResourceMutation.mutate(resource.resource_id);
        }
    };

    const handleDeleteAnnouncement = async (announcement) => {
        const confirmed = await confirm({
            title: "Delete announcement?",
            message: `Remove "${announcement.title}"?`,
            confirmLabel: "Delete",
            cancelLabel: "Cancel",
            danger: true
        });

        if (confirmed) {
            deleteAnnouncementMutation.mutate(announcement.announcement_id);
        }
    };

    const handleExport = async (format) => {
        setExporting(format);

        try {
            const response = await exportCourseProgress(courseId, format);
            downloadBlob(
                response.data,
                `${courseQuery.data.course_code}-progress.${format}`
            );
        } catch (err) {
            showToast(getErrorMessage(err), "error");
        } finally {
            setExporting(null);
        }
    };

    if (courseQuery.isLoading || !editForm) {
        return (
            <AppShell title={pageTitle} navItems={shellNav}>
                <Spinner />
            </AppShell>
        );
    }

    const course = courseQuery.data;
    const atRiskCount = (progressQuery.data || []).filter((item) => item.at_risk).length;

    return (
        <AppShell title={pageTitle} navItems={shellNav}>
            <div className="stack">
                <div className="row">
                    <Link to={backPath} className="muted">← Back to courses</Link>
                    {isAdminRoute && user.role === ROLES.ADMIN && (
                        <Badge tone="neutral">Admin view</Badge>
                    )}
                    {atRiskCount > 0 && (
                        <Badge tone="warning">{atRiskCount} at-risk students</Badge>
                    )}
                </div>

                <div>
                    <h1 className="page-title">{course.course_title}</h1>
                    <p className="page-subtitle">
                        {course.course_code}
                        {course.lecturer_name ? ` · ${course.lecturer_name}` : ""}
                    </p>
                </div>

                <Tabs
                    tabs={MANAGE_TABS}
                    activeTab={activeTab}
                    onChange={setActiveTab}
                />

                {activeTab === "details" && (
                    <Card title="Course details">
                        <form
                            className="stack"
                            onSubmit={(event) => {
                                event.preventDefault();
                                updateMutation.mutate();
                            }}
                        >
                            <Field label="Course code" htmlFor="course_code">
                                <TextInput
                                    id="course_code"
                                    value={editForm.course_code}
                                    onChange={(event) =>
                                        setEditForm((prev) => ({
                                            ...prev,
                                            course_code: event.target.value
                                        }))
                                    }
                                />
                            </Field>
                            <Field label="Course title" htmlFor="course_title">
                                <TextInput
                                    id="course_title"
                                    value={editForm.course_title}
                                    onChange={(event) =>
                                        setEditForm((prev) => ({
                                            ...prev,
                                            course_title: event.target.value
                                        }))
                                    }
                                />
                            </Field>
                            <Field label="Description" htmlFor="description">
                                <TextArea
                                    id="description"
                                    value={editForm.description}
                                    onChange={(event) =>
                                        setEditForm((prev) => ({
                                            ...prev,
                                            description: event.target.value
                                        }))
                                    }
                                />
                            </Field>
                            <Field
                                label="Completion target (minutes)"
                                htmlFor="completion_target_minutes"
                                hint="Students reach 100% after logging this many study minutes."
                            >
                                <TextInput
                                    id="completion_target_minutes"
                                    type="number"
                                    min="1"
                                    value={editForm.completion_target_minutes}
                                    onChange={(event) =>
                                        setEditForm((prev) => ({
                                            ...prev,
                                            completion_target_minutes: event.target.value
                                        }))
                                    }
                                />
                            </Field>

                            {isAdminRoute && user.role === ROLES.ADMIN && (
                                <Field label="Assigned lecturer" htmlFor="lecturer_id">
                                    <select
                                        id="lecturer_id"
                                        value={selectedLecturerId}
                                        onChange={(event) =>
                                            setSelectedLecturerId(event.target.value)
                                        }
                                    >
                                        {(lecturersQuery.data || []).map((lecturer) => (
                                            <option
                                                key={lecturer.user_id}
                                                value={lecturer.user_id}
                                            >
                                                {lecturer.full_name} ({lecturer.email})
                                            </option>
                                        ))}
                                    </select>
                                    <Button
                                        type="button"
                                        small
                                        variant="secondary"
                                        disabled={reassignMutation.isPending}
                                        onClick={() => reassignMutation.mutate()}
                                    >
                                        Reassign lecturer
                                    </Button>
                                </Field>
                            )}

                            <div className="row">
                                <Button type="submit" disabled={updateMutation.isPending}>
                                    {updateMutation.isPending ? "Saving..." : "Save changes"}
                                </Button>
                                <Button
                                    type="button"
                                    variant="danger"
                                    onClick={handleDeleteCourse}
                                    disabled={deleteMutation.isPending}
                                >
                                    Delete course
                                </Button>
                            </div>
                        </form>
                    </Card>
                )}

                {activeTab === "announcements" && (
                    <>
                        <Card title="Post announcement">
                            <form
                                className="stack"
                                onSubmit={(event) => {
                                    event.preventDefault();
                                    announcementMutation.mutate();
                                }}
                            >
                                <Field label="Title" htmlFor="announcement_title">
                                    <TextInput
                                        id="announcement_title"
                                        value={announcementForm.title}
                                        onChange={(event) =>
                                            setAnnouncementForm((prev) => ({
                                                ...prev,
                                                title: event.target.value
                                            }))
                                        }
                                        required
                                    />
                                </Field>
                                <Field label="Message" htmlFor="announcement_body">
                                    <TextArea
                                        id="announcement_body"
                                        value={announcementForm.body}
                                        onChange={(event) =>
                                            setAnnouncementForm((prev) => ({
                                                ...prev,
                                                body: event.target.value
                                            }))
                                        }
                                        required
                                    />
                                </Field>
                                <Button type="submit" disabled={announcementMutation.isPending}>
                                    {announcementMutation.isPending
                                        ? "Posting..."
                                        : "Post announcement"}
                                </Button>
                            </form>
                        </Card>

                        <Card title="Announcements">
                            {announcementsQuery.isLoading && <Spinner />}
                            {!announcementsQuery.isLoading
                                && announcementsQuery.data?.length === 0 && (
                                <div className="empty-state">
                                    <p>No announcements yet.</p>
                                </div>
                            )}
                            <div className="stack">
                                {(announcementsQuery.data || []).map((announcement) => (
                                    <div key={announcement.announcement_id} className="row">
                                        <div>
                                            <strong>{announcement.title}</strong>
                                            <p className="muted">
                                                {announcement.author_name} ·{" "}
                                                {new Date(
                                                    announcement.created_at
                                                ).toLocaleString()}
                                            </p>
                                            <p>{announcement.body}</p>
                                        </div>
                                        <Button
                                            small
                                            variant="danger"
                                            onClick={() =>
                                                handleDeleteAnnouncement(announcement)
                                            }
                                        >
                                            Delete
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        </Card>
                    </>
                )}

                {activeTab === "resources" && (
                    <>
                        <Card title="Upload resource">
                            <form
                                className="stack"
                                onSubmit={(event) => {
                                    event.preventDefault();
                                    uploadMutation.mutate();
                                }}
                            >
                                <Field label="Title" htmlFor="resource_title">
                                    <TextInput
                                        id="resource_title"
                                        value={uploadTitle}
                                        onChange={(event) => setUploadTitle(event.target.value)}
                                        required
                                    />
                                </Field>
                                <Field label="File" htmlFor="resource_file" hint="PDF, MP4, PNG, or JPEG">
                                    <input
                                        id="resource_file"
                                        type="file"
                                        accept=".pdf,.mp4,.png,.jpg,.jpeg"
                                        onChange={(event) =>
                                            setUploadFile(event.target.files?.[0] || null)
                                        }
                                        required
                                    />
                                </Field>
                                <Button type="submit" disabled={uploadMutation.isPending || !uploadFile}>
                                    {uploadMutation.isPending ? "Uploading..." : "Upload resource"}
                                </Button>
                            </form>
                        </Card>

                        <Card title="Resources">
                            {resourcesQuery.isLoading && <Spinner />}
                            {!resourcesQuery.isLoading && resourcesQuery.data?.length === 0 && (
                                <div className="empty-state">
                                    <p>No resources uploaded yet.</p>
                                </div>
                            )}
                            <div className="stack">
                                {paginatedResources.map((resource) => (
                                    <div key={resource.resource_id} className="row">
                                        <div>
                                            <strong>{resource.title}</strong>
                                            <p className="muted">{resource.file_type}</p>
                                        </div>
                                        <div className="row">
                                            <ResourceActions resource={resource} />
                                            <Button
                                                small
                                                variant="danger"
                                                onClick={() => handleDeleteResource(resource)}
                                            >
                                                Delete
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <Pagination
                                page={resourcesPage}
                                totalPages={resourcesTotalPages}
                                totalItems={resourcesTotalItems}
                                onPageChange={setResourcesPage}
                            />
                        </Card>
                    </>
                )}

                {activeTab === "students" && (
                    <Card title="Enrolled students">
                        {enrollmentsQuery.isLoading && <Spinner />}
                        {!enrollmentsQuery.isLoading && enrollmentsQuery.data?.length === 0 && (
                            <div className="empty-state">
                                <p>No students enrolled yet.</p>
                            </div>
                        )}
                        <div className="stack">
                            {paginatedStudents.map((student) => (
                                <div key={student.enrollment_id}>
                                    <strong>{student.full_name}</strong>
                                    <p className="muted">{student.email}</p>
                                </div>
                            ))}
                        </div>
                        <Pagination
                            page={studentsPage}
                            totalPages={studentsTotalPages}
                            totalItems={studentsTotalItems}
                            onPageChange={setStudentsPage}
                        />
                    </Card>
                )}

                {activeTab === "progress" && (
                    <Card title="Student progress">
                        <div className="row" style={{ marginBottom: "1rem" }}>
                            <Button
                                small
                                variant="secondary"
                                disabled={exporting === "csv"}
                                onClick={() => handleExport("csv")}
                            >
                                {exporting === "csv" ? "Exporting..." : "Export CSV"}
                            </Button>
                            <Button
                                small
                                variant="secondary"
                                disabled={exporting === "pdf"}
                                onClick={() => handleExport("pdf")}
                            >
                                {exporting === "pdf" ? "Exporting..." : "Export PDF"}
                            </Button>
                        </div>

                        {progressQuery.isLoading && <Spinner />}
                        {!progressQuery.isLoading && progressQuery.data?.length === 0 && (
                            <div className="empty-state">
                                <p>No progress recorded yet.</p>
                            </div>
                        )}
                        <div className="stack">
                            {paginatedProgress.map((item) => (
                                <div key={item.progress_id} className="row">
                                    <div>
                                        <strong>{item.student_name}</strong>
                                        <p className="muted">
                                            Last log:{" "}
                                            {item.last_log_date
                                                ? new Date(item.last_log_date).toLocaleDateString()
                                                : "None"}
                                        </p>
                                    </div>
                                    <div className="row">
                                        {item.at_risk && (
                                            <Badge tone="warning">At risk</Badge>
                                        )}
                                        <Badge tone="neutral">
                                            {item.completion_percentage}% · {item.total_study_time} min
                                        </Badge>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <Pagination
                            page={progressPage}
                            totalPages={progressTotalPages}
                            totalItems={progressTotalItems}
                            onPageChange={setProgressPage}
                        />
                    </Card>
                )}
            </div>
        </AppShell>
    );
}
