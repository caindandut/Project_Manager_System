import axiosClient from "./axiosClient";

const documentApi = {
  /**
   * @param {number} projectId
   * @param {number|null} [parentId]
   */
  getDocuments: (projectId, parentId = null) =>
    axiosClient.get(`/projects/${projectId}/documents`, { params: { parentId } }),

  createFolder: (projectId, { name, parentId = null }) =>
    axiosClient.post(`/projects/${projectId}/documents/folder`, { name, parentId }),

  uploadFile: (projectId, { file, parentId = null }) => {
    const form = new FormData();
    form.append("file", file);
    // parentId có thể là null
    form.append("parentId", parentId == null ? "" : String(parentId));
    return axiosClient.post(`/projects/${projectId}/documents/upload`, form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },

  linkExternal: (projectId, { name, url }) =>
    axiosClient.post(`/projects/${projectId}/documents/link`, { name, url }),

  download: (documentId) =>
    axiosClient.get(`/documents/${documentId}/download`, { responseType: "blob" }),

  remove: (documentId) => axiosClient.delete(`/documents/${documentId}`),
};

export default documentApi;

