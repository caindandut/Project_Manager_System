import fs from 'fs';
import path from 'path';
import multer, { FileFilterCallback } from 'multer';
import type { Request } from 'express';

const UPLOAD_ROOT = path.resolve(process.cwd(), 'uploads');
const AVATAR_DIR = path.join(UPLOAD_ROOT, 'avatars');
const DOCUMENT_DIR = path.join(UPLOAD_ROOT, 'documents');
const CHAT_DIR = path.join(UPLOAD_ROOT, 'chat');

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

type UploadType = 'avatar' | 'document' | 'chat';

const storage = multer.diskStorage({
  destination: (_req, file, cb) => {
    let targetDir = DOCUMENT_DIR;
    const field = file.fieldname;

    if (field.includes('avatar')) {
      targetDir = AVATAR_DIR;
    } else if (field.includes('chat') || field.includes('message')) {
      targetDir = CHAT_DIR;
    }

    ensureDir(UPLOAD_ROOT);
    ensureDir(targetDir);
    cb(null, targetDir);
  },
  filename: (_req, file, cb) => {
    const timestamp = Date.now();
    const safeOriginal = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, `${timestamp}-${safeOriginal}`);
  },
});

const allowedImageMime = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const allowedDocMime = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
];

function fileFilterFor(type: UploadType) {
  return (_req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
    const mime = file.mimetype;

    if (type === 'avatar') {
      if (!allowedImageMime.includes(mime)) {
        return cb(new Error('Chỉ chấp nhận file ảnh (jpeg, png, gif, webp) cho avatar'));
      }
      return cb(null, true);
    }

    if (type === 'chat') {
      if (allowedImageMime.includes(mime) || allowedDocMime.includes(mime)) {
        return cb(null, true);
      }
      return cb(new Error('Định dạng file chat không được hỗ trợ'));
    }

    // document
    if (allowedImageMime.includes(mime) || allowedDocMime.includes(mime)) {
      return cb(null, true);
    }
    return cb(new Error('Định dạng tài liệu không được hỗ trợ'));
  };
}

// Giới hạn chung: 10MB / file
const TEN_MB = 10 * 1024 * 1024;

const avatarUpload = multer({
  storage,
  limits: { fileSize: TEN_MB },
  fileFilter: fileFilterFor('avatar'),
});

const documentUpload = multer({
  storage,
  limits: { fileSize: TEN_MB },
  fileFilter: fileFilterFor('document'),
});

const chatUpload = multer({
  storage,
  limits: { fileSize: TEN_MB },
  fileFilter: fileFilterFor('chat'),
});

export const uploadAvatarSingle = avatarUpload.single('avatar');
export const uploadDocumentSingle = documentUpload.single('file');
export const uploadChatSingle = chatUpload.single('file');

