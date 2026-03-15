import axiosClient from "./axiosClient";

const companyApi = {
  get: () => axiosClient.get("/company"),
  update: (data) => axiosClient.put("/company", data),
};

export default companyApi;
