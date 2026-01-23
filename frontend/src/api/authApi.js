import axiosClient from "./axiosClient";

const authApi = {
  login: (params) => {
    const url = '/auth/login';
    return axiosClient.post(url, params);
  },

  getMe: () => {
    const url = '/auth/me';
    return axiosClient.get(url);
  },

  loginGoogle: (params) => {
    const url = '/auth/google';
    return axiosClient.post(url, params);
  }
};

export default authApi;