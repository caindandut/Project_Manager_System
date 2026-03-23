import axiosClient from "./axiosClient";

const chatApi = {
  getGroups: () => axiosClient.get("/chat/groups"),
  createGroup: (payload) => axiosClient.post("/chat/groups", payload),

  getMessages: (groupId, params = {}) =>
    axiosClient.get(`/chat/groups/${groupId}/messages`, { params }),
  sendMessage: (groupId, payload) =>
    axiosClient.post(`/chat/groups/${groupId}/messages`, payload),
  markGroupRead: (groupId) =>
    axiosClient.put(`/chat/groups/${groupId}/read`),

  getOrCreateDirect: (userId) => axiosClient.get(`/chat/direct/${userId}`),
  sendDirectMessage: (userId, payload) =>
    axiosClient.post(`/chat/direct/${userId}/messages`, payload),
};

export default chatApi;

