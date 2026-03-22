import axiosClient from "./axiosClient";

/**
 * GĐ2 mục 2.5 — API công việc (task).
 * Base URL đã gồm `/api` (axiosClient).
 */
const taskApi = {
  create: (groupId, data) =>
    axiosClient.post(`/task-groups/${groupId}/tasks`, data),

  getById: (id) => axiosClient.get(`/tasks/${id}`),

  update: (id, data) => axiosClient.put(`/tasks/${id}`, data),

  remove: (id) => axiosClient.delete(`/tasks/${id}`),

  updateStatus: (id, status) =>
    axiosClient.put(`/tasks/${id}/status`, { status }),

  updateProgress: (id, pct) =>
    axiosClient.put(`/tasks/${id}/progress`, { percent: pct }),

  archive: (id) => axiosClient.put(`/tasks/${id}/archive`),

  assign: (id, data) => axiosClient.post(`/tasks/${id}/assignees`, data),

  unassign: (id, userId) =>
    axiosClient.delete(`/tasks/${id}/assignees/${userId}`),

  createSubtask: (id, data) =>
    axiosClient.post(`/tasks/${id}/subtasks`, data),

  getSubtasks: (id) => axiosClient.get(`/tasks/${id}/subtasks`),

  addDep: (id, preId) =>
    axiosClient.post(`/tasks/${id}/dependencies`, {
      predecessor_id: preId,
    }),

  removeDep: (id, preId) =>
    axiosClient.delete(`/tasks/${id}/dependencies/${preId}`),

  move: (id, data) => axiosClient.post(`/tasks/${id}/move`, data),

  /** @param {number} groupId @param {number[]} ids */
  reorder: (groupId, ids) =>
    axiosClient.put(`/task-groups/${groupId}/tasks/reorder`, {
      ordered_ids: ids,
    }),

  /**
   * @param {Record<string, unknown>} [filters] — status, priority, project_id, search (query)
   */
  getMyTasks: (filters = {}) =>
    axiosClient.get("/users/me/tasks", { params: filters }),
};

export default taskApi;
