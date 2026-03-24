import axiosClient from "./axiosClient";

const reportApi = {
  getDashboard: () => axiosClient.get("/reports/dashboard"),
  getProjectReport: (projectId) => axiosClient.get(`/reports/projects/${projectId}`),
  getProjectBurndown: (projectId) => axiosClient.get(`/reports/projects/${projectId}/burndown`),
  getEmployeeReport: (employeeId, projectId) =>
    axiosClient.get(`/reports/employees/${employeeId}`, {
      params: projectId ? { projectId } : undefined,
    }),
};

export default reportApi;
