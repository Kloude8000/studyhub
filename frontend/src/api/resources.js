import api from "./client";

export const getCourseResources = (courseId) =>
    api.get(`/api/resources/course/${courseId}`);

export const uploadResource = (courseId, formData) =>
    api.post(`/api/resources/upload/${courseId}`, formData, {
        headers: { "Content-Type": "multipart/form-data" }
    });

export const deleteResource = (resourceId) =>
    api.delete(`/api/resources/${resourceId}`);

const fetchResourceBlob = async (resourceId) => {
    const response = await api.get(
        `/api/resources/${resourceId}/download`,
        { responseType: "blob" }
    );

    return response.data;
};

export const viewResource = async (resource) => {
    const blob = await api.get(
        `/api/resources/${resource.resource_id}/view`,
        { responseType: "blob" }
    ).then((response) => response.data);

    const url = window.URL.createObjectURL(
        new Blob([blob], { type: resource.file_type })
    );

    window.open(url, "_blank", "noopener,noreferrer");

    setTimeout(() => {
        window.URL.revokeObjectURL(url);
    }, 60000);
};

export const downloadResource = async (resourceId, filename, fileType) => {
    const blob = await fetchResourceBlob(resourceId);

    const url = window.URL.createObjectURL(
        new Blob([blob], { type: fileType || blob.type })
    );
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", filename || "resource");
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
};
