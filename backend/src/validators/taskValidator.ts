import { z } from 'zod';

const taskPriorityEnum = z.enum(['Low', 'Medium', 'High', 'Urgent']);
const taskStatusEnum = z.enum(['Todo', 'InProgress', 'Review', 'Completed', 'Overdue']);
const assigneeRoleEnum = z.enum(['Main', 'Support']);

const dateTimeString = z
  .string()
  .refine((val) => !isNaN(Date.parse(val)), { message: 'Thời điểm không đúng định dạng' })
  .optional()
  .nullable();

const taskLabelField = z.preprocess(
  (val) => {
    if (val === undefined || val === null) return undefined;
    if (typeof val !== 'string') return val;
    const t = val.trim();
    return t === '' ? undefined : t;
  },
  z.string().max(100, 'Nhãn task tối đa 100 ký tự').optional(),
);

const taskLabelUpdateField = z.preprocess(
  (val) => {
    if (val === undefined) return undefined;
    if (val === null) return null;
    if (typeof val !== 'string') return val;
    const t = val.trim();
    return t === '' ? null : t;
  },
  z.string().max(100, 'Nhãn task tối đa 100 ký tự').nullable().optional(),
);

/** POST /task-groups/:groupId/tasks */
export const createTaskSchema = z.object({
  title: z
    .string()
    .min(1, 'Tiêu đề task không được để trống')
    .max(255, 'Tiêu đề tối đa 255 ký tự')
    .transform((v) => v.trim()),
  description: z
    .string()
    .max(5000, 'Mô tả tối đa 5000 ký tự')
    .transform((v) => v.trim())
    .optional()
    .nullable(),
  label: taskLabelField,
  deadline: dateTimeString,
  priority: taskPriorityEnum.optional().default('Medium'),
  assignee_ids: z.array(z.number().int().positive()).optional(),
});

/** PUT /tasks/:id */
export const updateTaskSchema = z.object({
  title: z
    .string()
    .min(1, 'Tiêu đề không được để trống')
    .max(255, 'Tiêu đề tối đa 255 ký tự')
    .transform((v) => v.trim())
    .optional(),
  description: z
    .string()
    .max(5000, 'Mô tả tối đa 5000 ký tự')
    .transform((v) => v.trim())
    .optional()
    .nullable(),
  label: taskLabelUpdateField,
  deadline: dateTimeString,
  priority: taskPriorityEnum.optional(),
});

/** PUT /tasks/:id/status */
export const updateTaskStatusSchema = z.object({
  status: taskStatusEnum,
});

/** PUT /tasks/:id/progress */
export const updateTaskProgressSchema = z.object({
  percent: z.number().int('Tiến độ phải là số nguyên').min(0).max(100),
});

/** POST /tasks/:id/assignees */
export const assignTaskSchema = z.object({
  user_id: z.number().int().positive('ID người dùng không hợp lệ'),
  role: assigneeRoleEnum.optional().default('Support'),
});

/** POST /tasks/:id/subtasks */
export const createSubtaskSchema = z.object({
  title: z
    .string()
    .min(1, 'Tiêu đề subtask không được để trống')
    .max(255, 'Tiêu đề tối đa 255 ký tự')
    .transform((v) => v.trim()),
  description: z
    .string()
    .max(5000, 'Mô tả tối đa 5000 ký tự')
    .transform((v) => v.trim())
    .optional()
    .nullable(),
  priority: taskPriorityEnum.optional().default('Medium'),
});

/** POST /tasks/:id/dependencies */
export const addDependencySchema = z.object({
  predecessor_id: z.number().int().positive(),
});

/** POST /tasks/:id/move */
export const moveTaskSchema = z.object({
  target_group_id: z.number().int().positive(),
  position: z.number().int().min(0, 'Vị trí không hợp lệ'),
});

/** GET /users/me/tasks — query */
export const myTasksQuerySchema = z.object({
  status: taskStatusEnum.optional(),
  priority: taskPriorityEnum.optional(),
  project_id: z.coerce.number().int().positive().optional(),
  search: z.string().trim().max(255).optional(),
});

export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
export type UpdateTaskStatusInput = z.infer<typeof updateTaskStatusSchema>;
export type UpdateTaskProgressInput = z.infer<typeof updateTaskProgressSchema>;
export type AssignTaskInput = z.infer<typeof assignTaskSchema>;
export type CreateSubtaskInput = z.infer<typeof createSubtaskSchema>;
export type AddDependencyInput = z.infer<typeof addDependencySchema>;
export type MoveTaskInput = z.infer<typeof moveTaskSchema>;
export type MyTasksQueryInput = z.infer<typeof myTasksQuerySchema>;
