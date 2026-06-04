import { useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import AppShell from "../../components/layout/AppShell";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Badge from "../../components/ui/Badge";
import Spinner from "../../components/ui/Spinner";
import Tabs from "../../components/ui/Tabs";
import { Field, TextArea, TextInput } from "../../components/ui/Input";
import {
    deleteCourse,
    getCourse,
    updateCourse
} from "../../api/courses";
import { getCourseEnrollments } from "../../api/enrollments";
import {
    deleteResource,
    getCourseResources,
    uploadResource
} from "../../api/resources";
import { getCourseProgress } from "../../api/progress";
import { getErrorMessage } from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { useConfirm } from "../../context/ConfirmContext";
import { ROLES } from "../../constants/roles";
import { lecturerNav } from "./lecturerNav";
import { adminNav } from "../admin/adminNav";
import ResourceActions from "../../components/ResourceActions";

const MANAGE_TABS = [
    { id: "details", label: "Details" },
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

    const courseQuery = useQuery({
        queryKey: ["course", courseId],
        queryFn: async () => {
            const response = await getCourse(courseId);
            setEditForm({
                course_code: response.data.course_code,
                course_title: response.data.course_title,
                description: response.data.description || ""
            });
            return response.data;
        }
    });

    const resourcesQuery = useQuery({
        queryKey: ["course-resources", courseId],
        queryFn: async () => (await getCourseResources(courseId)).data
    });

    const enrollmentsQuery = useQuery({
        queryKey: ["course-enrollments", courseId],
        queryFn: async () => (await getCourseEnrollments(courseId)).data
    });

    const progressQuery = useQuery({
        queryKey: ["course-progress", courseId],
        queryFn: async () => (await getCourseProgress(courseId)).data
    });

    const updateMutation = useMutation({
        mutationFn: () => updateCourse(courseId, editForm),
        onSuccess: async () => {
            showToast("Course updated.");
            await queryClient.invalidateQueries({ queryKey: ["course", courseId] });
            await queryClient.invalidateQueries({ queryKey: ["lecturer-courses"] });
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

    if (courseQuery.isLoading || !editForm) {
        return (
            <AppShell title={pageTitle} navItems={shellNav}>
                <Spinner />
            </AppShell>
        );
    }

    const course = courseQuery.data;

    return (
        <AppShell title={pageTitle} navItems={shellNav}>
            <div className="stack">
                <div className="row">
                    <Link to={backPath} className="muted">← Back to courses</Link>
                    {isAdminRoute && user.role === ROLES.ADMIN && (
                        <Badge tone="neutral">Admin view</Badge>
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
                                {(resourcesQuery.data || []).map((resource) => (
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
                            {(enrollmentsQuery.data || []).map((student) => (
                                <div key={student.enrollment_id}>
                                    <strong>{student.full_name}</strong>
                                    <p className="muted">{student.email}</p>
                                </div>
                            ))}
                        </div>
                    </Card>
                )}

                {activeTab === "progress" && (
                    <Card title="Student progress">
                        {progressQuery.isLoading && <Spinner />}
                        {!progressQuery.isLoading && progressQuery.data?.length === 0 && (
                            <div className="empty-state">
                                <p>No progress recorded yet.</p>
                            </div>
                        )}
                        <div className="stack">
                            {(progressQuery.data || []).map((item) => (
                                <div key={item.progress_id} className="row">
                                    <strong>{item.student_name}</strong>
                                    <Badge tone="warning">
                                        {item.completion_percentage}% · {item.total_study_time} min
                                    </Badge>
                                </div>
                            ))}
                        </div>
                    </Card>
                )}
            </div>
        </AppShell>
    );
}
