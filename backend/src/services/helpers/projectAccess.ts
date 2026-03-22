import { prisma } from '../../lib/prisma';
import { ForbiddenError, NotFoundError } from '../../utils/AppError';

/** Admin (cùng company) hoặc thành viên dự án — đọc dữ liệu dự án / task. */
export async function assertProjectAccess(projectId: number, actorId: number): Promise<void> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: {
      id: true,
      company_id: true,
      projectmember: { select: { user_id: true } },
    },
  });
  if (!project) {
    throw new NotFoundError('Không tìm thấy dự án');
  }

  const requester = await prisma.user.findUnique({
    where: { id: actorId },
    select: { role: true, company_id: true },
  });
  if (!requester) {
    throw new NotFoundError('Không tìm thấy người dùng');
  }

  if (requester.role === 'Admin') {
    if (project.company_id == null || project.company_id !== requester.company_id) {
      throw new ForbiddenError('Bạn không có quyền truy cập dự án này');
    }
    return;
  }

  const isMember = project.projectmember.some((pm) => pm.user_id === actorId);
  if (!isMember) {
    throw new ForbiddenError('Bạn không phải thành viên của dự án này');
  }
}

/**
 * Tạo / sửa task, nhóm, reorder — Admin, Manager, Member (Viewer không được).
 */
export async function assertCanMutateTasksOnProject(projectId: number, actorId: number): Promise<void> {
  await assertProjectAccess(projectId, actorId);

  const requester = await prisma.user.findUnique({
    where: { id: actorId },
    select: { role: true },
  });
  if (requester?.role === 'Admin') {
    return;
  }

  const membership = await prisma.projectmember.findUnique({
    where: {
      project_id_user_id: { project_id: projectId, user_id: actorId },
    },
    select: { role: true },
  });

  if (membership?.role === 'Viewer') {
    throw new ForbiddenError('Viewer không được tạo hoặc sửa công việc trong dự án');
  }
}

/**
 * Admin (cùng company) hoặc Manager dự án.
 * @param forbiddenMessage — tùy chỉnh thông báo 403 (VD: xóa nhóm vs archive task)
 */
export async function assertManagerOrAdminOnProject(
  projectId: number,
  actorId: number,
  forbiddenMessage = 'Chỉ Admin hoặc Manager của dự án mới có quyền thực hiện thao tác này',
): Promise<void> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { id: true, company_id: true },
  });
  if (!project) {
    throw new NotFoundError('Không tìm thấy dự án');
  }

  const requester = await prisma.user.findUnique({
    where: { id: actorId },
    select: { role: true, company_id: true },
  });
  if (!requester) {
    throw new NotFoundError('Không tìm thấy người dùng');
  }

  if (requester.role === 'Admin') {
    if (project.company_id == null || project.company_id !== requester.company_id) {
      throw new ForbiddenError('Bạn không có quyền truy cập dự án này');
    }
    return;
  }

  const membership = await prisma.projectmember.findUnique({
    where: {
      project_id_user_id: { project_id: projectId, user_id: actorId },
    },
    select: { role: true },
  });

  if (!membership || membership.role !== 'Manager') {
    throw new ForbiddenError(forbiddenMessage);
  }
}
