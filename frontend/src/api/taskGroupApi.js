import axiosClient from "./axiosClient";

/**
 * GĐ2 mục 2.5 — API nhóm công việc (task group).
 * Base URL đã gồm `/api` (axiosClient).
 */
const taskGroupApi = {
  getByProject: (projectId) =>
    axiosClient.get(`/projects/${projectId}/task-groups`),

  create: (projectId, data) =>
    axiosClient.post(`/projects/${projectId}/task-groups`, data),

  update: (id, data) => axiosClient.put(`/task-groups/${id}`, data),

  remove: (id) => axiosClient.delete(`/task-groups/${id}`),

  /** @param {number} projectId @param {number[]} ids — gửi body { ordered_ids } */
  reorder: (projectId, ids) =>
    axiosClient.put(`/projects/${projectId}/task-groups/reorder`, {
      ordered_ids: ids,
    }),
};

export default taskGroupApi;
