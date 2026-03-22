import axiosClient from "./axiosClient";

const projectApi = {
  getAll: () => axiosClient.get("/projects"),
  getById: (id) => axiosClient.get(`/projects/${id}`),
  create: (data) => axiosClient.post("/projects", data),
  update: (id, data) => axiosClient.put(`/projects/${id}`, data),
  archive: (id) => axiosClient.delete(`/projects/${id}`),

  getMembers: (id) => axiosClient.get(`/projects/${id}/members`),
  getMemberCandidates: (id) => axiosClient.get(`/projects/${id}/member-candidates`),
  addMember: (id, data) => axiosClient.post(`/projects/${id}/members`, data),
  removeMember: (projectId, userId) =>
    axiosClient.delete(`/projects/${projectId}/members/${userId}`),
  updateMemberRole: (projectId, userId, role) =>
    axiosClient.put(`/projects/${projectId}/members/${userId}`, { role }),

  getStats: (id) => axiosClient.get(`/projects/${id}/stats`),
};

export default projectApi;
