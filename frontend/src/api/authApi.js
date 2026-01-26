import axiosClient from "./axiosClient";

const authApi = {
  login: (params) => axiosClient.post('/auth/login', params),
  getMe: () => axiosClient.get('/auth/me'),
  loginGoogle: (params) => axiosClient.post('/auth/google', params),
  forgotPassword: (email) => axiosClient.post('/auth/forgot-password', { email }),
  verifyResetToken: (token) => axiosClient.get(`/auth/verify-reset-token/${token}`),
  resetPassword: (token, password) => axiosClient.post(`/auth/reset-password/${token}`, { password }),
};

export default authApi;