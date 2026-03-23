import express, { Router } from 'express';
import { protect } from '../middlewares/authMiddleware';
import { validate } from '../middlewares/validateMiddleware';
import { uploadDocumentSingle } from '../middlewares/uploadMiddleware';
import {
  createFolder,
  deleteDocument,
  downloadDocument,
  listDocuments,
  linkExternalDocument,
  uploadFile,
} from '../controllers/documentController';
import {
  createFolderSchema,
  documentsQuerySchema,
  linkExternalDocumentSchema,
  uploadFileSchema,
} from '../validators/documentValidator';

const router: Router = express.Router();

router.use(protect);

// POST /api/projects/:id/documents/folder
router.post('/projects/:id/documents/folder', validate(createFolderSchema), createFolder);

// POST /api/projects/:id/documents/upload
router.post(
  '/projects/:id/documents/upload',
  uploadDocumentSingle,
  validate(uploadFileSchema),
  uploadFile,
);

// POST /api/projects/:id/documents/link
router.post('/projects/:id/documents/link', validate(linkExternalDocumentSchema), linkExternalDocument);

// GET /api/projects/:id/documents?parentId=
router.get('/projects/:id/documents', validate(documentsQuerySchema, 'query'), listDocuments);

// GET /api/documents/:id/download
router.get('/documents/:id/download', downloadDocument);

// DELETE /api/documents/:id
router.delete('/documents/:id', deleteDocument);

export default router;

