import axiosClient from "./axiosClient";


const commentApi = {
  /**
   * @param {number} taskId
   * @param {{ page?: number, limit?: number }} [params]
   */
  getByTask: (taskId, params = {}) =>
    axiosClient.get(`/tasks/${taskId}/comments`, { params }),

  /**
   * @param {number} taskId
   * @param {string} content
   */
  create: (taskId, content) =>
    axiosClient.post(`/tasks/${taskId}/comments`, { content }),

  /**
   * @param {number} id
   * @param {string} content
   */
  update: (id, content) =>
    axiosClient.put(`/comments/${id}`, { content }),

  /**
   * @param {number} id
   */
  remove: (id) => axiosClient.delete(`/comments/${id}`),
};

export default commentApi;

