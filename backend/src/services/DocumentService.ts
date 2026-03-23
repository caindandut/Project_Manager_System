import fs from 'fs';
import path from 'path';
import { prisma } from '../lib/prisma';
import { ValidationError, NotFoundError } from '../utils/AppError';
import { assertProjectAccess } from './helpers/projectAccess';

type MulterFileLike = {
  filename: string;
  path: string;
  size: number;
  mimetype: string;
};

export type DocumentNode = {
  id: number;
  type: 'Folder' | 'File';
  file_name: string;
  file_path: string;
  size_kb: number | null;
  mime_type: string | null;
  created_at: Date | null;
  children: DocumentNode[];
};

type DocumentRow = {
  id: number;
  type: 'Folder' | 'File';
  file_name: string;
  file_path: string;
  size_kb: number | null;
  mime_type: string | null;
  created_at: Date | null;
  parent_folder_id: number | null;
};

function toDbFilePath(filePath: string, uploadsRootAbs: string): string {
  // Tránh vượt độ dài VARCHAR(255) nếu lưu đường dẫn tuyệt đối quá dài.
  // Ưu tiên lưu đường dẫn tương đối trong phạm vi `/uploads/...`.
  if (!filePath) return '';
  const normalized = filePath.replace(/\\/g, '/');
  const uploadsRootNorm = uploadsRootAbs.replace(/\\/g, '/');

  const idx = normalized.lastIndexOf(uploadsRootNorm);
  if (idx >= 0) {
    return normalized.slice(idx);
  }

  if (path.isAbsolute(filePath)) {
    // Nếu không cắt được theo uploadsRootAbs thì fallback lưu trực tiếp (có thể vẫn ngắn đủ trong đa số trường hợp).
    return filePath;
  }

  return normalized;
}

function resolveFsPath(dbPath: string): string | null {
  if (!dbPath) return null;
  if (dbPath.startsWith('http://') || dbPath.startsWith('https://')) return null;

  // Nếu dbPath là đường dẫn tương đối kiểu `uploads/documents/...`
  // thì resolve theo project root.
  return path.isAbsolute(dbPath) ? dbPath : path.resolve(process.cwd(), dbPath);
}

function deleteFileIfExists(dbPath: string): void {
  const fsPath = resolveFsPath(dbPath);
  if (!fsPath) return;
  try {
    if (fs.existsSync(fsPath)) {
      fs.unlinkSync(fsPath);
    }
  } catch {
    // Không fail request khi không xóa được file trên disk.
  }
}

function assertNonEmptyName(name: string): string {
  const n = (name ?? '').trim();
  if (!n) throw new ValidationError('Tên tài liệu/thư mục không được để trống');
  if (n.length > 255) throw new ValidationError('Tên tài liệu/thư mục tối đa 255 ký tự');
  return n;
}

export class DocumentService {
  async createFolder(
    projectId: number,
    name: string,
    parentFolderId: number | null | undefined,
    uploaderId: number,
  ): Promise<{ id: number }> {
    await assertProjectAccess(projectId, uploaderId);

    const file_name = assertNonEmptyName(name);
    return prisma.document.create({
      data: {
        type: 'Folder',
        project_id: projectId,
        parent_folder_id: parentFolderId ?? null,
        uploader_id: uploaderId,
        file_name,
        file_path: '',
        size_kb: 0,
        mime_type: null,
      },
      select: { id: true },
    });
  }

  async uploadFile(
    projectId: number,
    file: MulterFileLike,
    parentFolderId: number | null | undefined,
    uploaderId: number,
  ): Promise<{ id: number; file_path: string }> {
    await assertProjectAccess(projectId, uploaderId);

    const file_name = assertNonEmptyName(file.filename);
    const uploadsRootAbs = path.resolve(process.cwd(), 'uploads');
    const file_path = toDbFilePath(file.path, uploadsRootAbs);

    if (!file_path) {
      throw new ValidationError('File upload không hợp lệ');
    }

    return prisma.document.create({
      data: {
        type: 'File',
        project_id: projectId,
        parent_folder_id: parentFolderId ?? null,
        uploader_id: uploaderId,
        file_name,
        file_path,
        size_kb: Math.floor((file.size ?? 0) / 1024),
        mime_type: file.mimetype ?? null,
      },
      select: { id: true, file_path: true },
    });
  }

  async getDocuments(
    projectId: number,
    parentFolderId: number | null | undefined,
  ): Promise<Omit<DocumentRow, 'parent_folder_id'>[]> {
    // Không dùng assertProjectAccess vì spec không nhận userId.
    // Controller sẽ handle phân quyền theo thực tế ở GĐ5. (Ở đây chỉ list theo projectId.)
    const parentId = parentFolderId ?? null;
    const rows = await prisma.document.findMany({
      where: { project_id: projectId, parent_folder_id: parentId },
      select: {
        id: true,
        type: true,
        file_name: true,
        file_path: true,
        size_kb: true,
        mime_type: true,
        created_at: true,
        parent_folder_id: true,
      },
    });

    const docs = rows as unknown as DocumentRow[];
    docs.sort((a, b) => {
      const aIsFolder = a.type === 'Folder';
      const bIsFolder = b.type === 'Folder';
      if (aIsFolder !== bIsFolder) return aIsFolder ? -1 : 1;
      return a.file_name.localeCompare(b.file_name, 'vi');
    });

    return docs.map((d) => ({
      id: d.id,
      type: d.type,
      file_name: d.file_name,
      file_path: d.file_path,
      size_kb: d.size_kb,
      mime_type: d.mime_type,
      created_at: d.created_at,
    }));
  }

  async getDocumentTree(projectId: number): Promise<DocumentNode[]> {
    const rows = await prisma.document.findMany({
      where: { project_id: projectId },
      select: {
        id: true,
        type: true,
        file_name: true,
        file_path: true,
        size_kb: true,
        mime_type: true,
        created_at: true,
        parent_folder_id: true,
      },
    });

    const docs = rows as unknown as DocumentRow[];
    const childrenByParent = new Map<number | null, DocumentRow[]>();
    for (const row of docs) {
      const key = row.parent_folder_id;
      const list = childrenByParent.get(key) ?? [];
      list.push(row);
      childrenByParent.set(key, list);
    }

    const sortList = (list: DocumentRow[]) =>
      list.sort((a, b) => {
        const aIsFolder = a.type === 'Folder';
        const bIsFolder = b.type === 'Folder';
        if (aIsFolder !== bIsFolder) return aIsFolder ? -1 : 1;
        return a.file_name.localeCompare(b.file_name, 'vi');
      });

    const build = (parentId: number | null): DocumentNode[] => {
      const list = childrenByParent.get(parentId) ?? [];
      sortList(list);
      return list.map((d) => ({
        id: d.id,
        type: d.type,
        file_name: d.file_name,
        file_path: d.file_path,
        size_kb: d.size_kb,
        mime_type: d.mime_type,
        created_at: d.created_at,
        children: build(d.id),
      }));
    };

    return build(null);
  }

  async downloadDocument(documentId: number): Promise<{ file_path: string }> {
    const doc = await prisma.document.findUnique({
      where: { id: documentId },
      select: { id: true, file_path: true },
    });

    if (!doc) throw new NotFoundError('Không tìm thấy tài liệu');
    if (!doc.file_path) {
      throw new ValidationError('Tài liệu không có đường dẫn tải');
    }

    return { file_path: doc.file_path };
  }

  async deleteDocument(documentId: number, userId: number): Promise<void> {
    const doc = await prisma.document.findUnique({
      where: { id: documentId },
      select: { id: true, type: true, file_path: true, project_id: true },
    });

    if (!doc) throw new NotFoundError('Không tìm thấy tài liệu');
    if (doc.project_id == null) throw new NotFoundError('Tài liệu không thuộc dự án nào');

    await assertProjectAccess(doc.project_id, userId);

    if (doc.type === 'File') {
      deleteFileIfExists(doc.file_path);
      await prisma.document.delete({ where: { id: documentId } });
      return;
    }

    // Folder: xoá toàn bộ file con trên disk trước, rồi xoá record folder (Prisma cascade sẽ xóa DB records).
    const folderQueue: number[] = [documentId];
    const filePathsToDelete = new Set<string>();

    while (folderQueue.length) {
      const current = folderQueue.pop();
      if (current == null) break;

      const children = await prisma.document.findMany({
        where: { parent_folder_id: current },
        select: { id: true, type: true, file_path: true },
      });

      for (const child of children) {
        if (child.type === 'Folder') folderQueue.push(child.id);
        if (child.type === 'File' && child.file_path) filePathsToDelete.add(child.file_path);
      }
    }

    for (const p of filePathsToDelete) {
      deleteFileIfExists(p);
    }

    await prisma.document.delete({ where: { id: documentId } });
  }

  async linkExternalDocument(
    projectId: number,
    input: { name: string; url: string },
    uploaderId: number,
  ): Promise<{ id: number }> {
    await assertProjectAccess(projectId, uploaderId);

    const file_name = assertNonEmptyName(input.name);
    const url = (input.url ?? '').trim();
    if (!url || (!url.startsWith('http://') && !url.startsWith('https://'))) {
      throw new ValidationError('URL liên kết không hợp lệ');
    }

    return prisma.document.create({
      data: {
        type: 'File',
        project_id: projectId,
        parent_folder_id: null,
        uploader_id: uploaderId,
        file_name,
        file_path: url,
        size_kb: 0,
        mime_type: null,
      },
      select: { id: true },
    });
  }
}

export const documentService = new DocumentService();

