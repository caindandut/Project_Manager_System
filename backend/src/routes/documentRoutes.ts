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

/**
 * projectDocumentRouter — mount tại /api/projects
 *   /:id/documents/folder    POST
 *   /:id/documents/upload    POST
 *   /:id/documents/link      POST
 *   /:id/documents           GET
 */
export const projectDocumentRouter: Router = express.Router();
projectDocumentRouter.use(protect);

projectDocumentRouter.post('/:id/documents/folder', validate(createFolderSchema), createFolder);
projectDocumentRouter.post(
  '/:id/documents/upload',
  uploadDocumentSingle,
  validate(uploadFileSchema),
  uploadFile,
);
projectDocumentRouter.post('/:id/documents/link', validate(linkExternalDocumentSchema), linkExternalDocument);
projectDocumentRouter.get('/:id/documents', validate(documentsQuerySchema, 'query'), listDocuments);

/**
 * flatDocumentRouter — mount tại /api
 *   /documents/:id/download  GET
 *   /documents/:id           DELETE
 */
export const flatDocumentRouter: Router = express.Router();
flatDocumentRouter.use(protect);

flatDocumentRouter.get('/documents/:id/download', downloadDocument);
flatDocumentRouter.delete('/documents/:id', deleteDocument);

