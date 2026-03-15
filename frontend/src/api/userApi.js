import axiosClient from "./axiosClient";

const userApi = {
  getAll: () => axiosClient.get("/users"),
  create: (data) => axiosClient.post("/users", data),
  updateRole: (id, role) => axiosClient.put(`/users/${id}/role`, { role }),
  updateStatus: (id, status) => axiosClient.put(`/users/${id}/status`, { status }),
  delete: (id) => axiosClient.delete(`/users/${id}`),
  verifyInviteToken: (token) => axiosClient.get("/users/verify-invite", { params: { token } }),
  acceptInvite: (payload) => axiosClient.post("/users/accept-invite", payload),
  getProfile: () => axiosClient.get("/users/profile"),
  updateProfile: (data) => axiosClient.put("/users/profile", data),
  changePassword: (data) => axiosClient.put("/users/change-password", data),
};

export default userApi;
