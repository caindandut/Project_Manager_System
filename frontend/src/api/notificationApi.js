import axiosClient from "./axiosClient";


const notificationApi = {
  /**
   * @param {{ page?: number, limit?: number }} [params]
   */
  getAll: (params = {}) =>
    axiosClient.get("/notifications", { params }),

  getUnreadCount: () =>
    axiosClient.get("/notifications/unread-count"),

  /**
   * @param {number} id
   */
  markAsRead: (id) =>
    axiosClient.put(`/notifications/${id}/read`),

  markAllAsRead: () =>
    axiosClient.put("/notifications/read-all"),
};

export default notificationApi;

