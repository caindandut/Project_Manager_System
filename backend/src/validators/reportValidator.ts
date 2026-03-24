import { z } from 'zod';

const numericId = z
  .string()
  .regex(/^\d+$/, 'ID không hợp lệ');

/** /projects/:id và /employees/:id */
export const reportIdParamSchema = z.object({
  id: numericId,
});

/** /employees/:id?projectId=... */
export const employeeReportQuerySchema = z.object({
  projectId: numericId.optional(),
});
