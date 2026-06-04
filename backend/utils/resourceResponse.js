const formatResource = (resource) => ({
    resource_id: resource.resource_id,
    course_id: resource.course_id,
    uploaded_by: resource.uploaded_by,
    title: resource.title,
    file_type: resource.file_type,
    uploader_name: resource.uploader_name,
    created_at: resource.created_at,
    view_url: `/api/resources/${resource.resource_id}/view`,
    download_url: `/api/resources/${resource.resource_id}/download`
});

const formatResources = (resources) =>
    resources.map(formatResource);

module.exports = {
    formatResource,
    formatResources
};
